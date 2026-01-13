const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = socketIo(server, {
  cors: {
    cors: {
      origin: "*", // Allow all origins for local dev/testing
      methods: ["GET", "POST"]
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/classrooms', require('./routes/classrooms'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/issues', require('./routes/issues'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/test-email', require('./routes/testEmail'));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  // Join room for classroom updates
  socket.on('join-classroom', (roomNumber) => {
    socket.join(`classroom-${roomNumber}`);
  });

  // Join coordinator dashboard
  socket.on('join-dashboard', () => {
    socket.join('coordinator-dashboard');
  });
});

// Make io available to routes
app.set('io', io);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use!`);
    console.log(`\nTo fix this, you can:`);
    console.log(`1. Kill the process using port ${PORT}:`);
    console.log(`   Windows: netstat -ano | findstr :${PORT}`);
    console.log(`   Then: taskkill /PID <PID> /F`);
    console.log(`   Mac/Linux: lsof -ti:${PORT} | xargs kill -9`);
    console.log(`\n2. Or change the port in your .env file:`);
    console.log(`   PORT=5001`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

// Export io for use in routes
module.exports = { io };

