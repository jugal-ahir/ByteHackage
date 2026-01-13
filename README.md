# Hackathon Management System

A complete, production-ready hackathon classroom and attendance management system for 36-hour on-campus hackathons. This system enables volunteers, coordinators, and organizers to manage classrooms, teams, attendance, issues, and emergencies in real-time.

## Features

### For Volunteers
- **Classroom Selection**: Select and lock to one assigned classroom per session
- **Attendance Management**: 
  - Detailed view with expandable teams and individual member status
  - Quick Attendance Mode for rush hours
  - Status options: Present, Absent, At Lunch, Sleeping, Left Campus
  - Auto-save with timestamp and volunteer identity
- **Classroom Status Bar**: One-tap status updates (Active, Lunch, Night, Emergency, Jury Visit, Empty)
- **Issue Reporting**: Quick-select categories (Medical, Technical/WiFi, Power, Food/Water, Security, Discipline, Equipment)
- **Critical Action Button**: Immediate alerts for teams leaving or missing

### For Coordinators & Organizers
- **Live Dashboard**: Real-time classroom grid showing all rooms with color-coded status
- **Issue Management**: View, track, and resolve reported issues
- **Emergency Alerts**: Real-time notifications for critical situations
- **Attendance Overview**: See present counts across all classrooms

### Technical Features
- **Real-time Updates**: Socket.io for instant synchronization across all devices
- **MongoDB Persistence**: Complete audit trail of all actions
- **Mobile-Optimized**: Large buttons, minimal typing, stress-friendly design
- **Session Management**: JWT-based authentication with classroom locking

## Tech Stack

- **Backend**: Node.js, Express.js, MongoDB, Mongoose, Socket.io
- **Frontend**: React, React Router, Socket.io Client, Axios
- **Authentication**: JWT (JSON Web Tokens)
- **Database**: MongoDB

## Prerequisites

Before running the application, ensure you have:

- Node.js (v14 or higher)
- MongoDB (running locally or MongoDB Atlas connection string)
- npm or yarn

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Hackathon_Management
```

### 2. Install Backend Dependencies

```bash
npm install
```

### 3. Install Frontend Dependencies

```bash
cd client
npm install
cd ..
```

### 4. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and configure the following:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
# For local MongoDB:
MONGODB_URI=mongodb://localhost:27017/hackathon_management
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hackathon_management

# JWT Secret (IMPORTANT: Change this to a random string in production)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Client URL (for CORS and Socket.io)
CLIENT_URL=http://localhost:3000

# Organizer Contacts (comma-separated for emergency notifications)
ORGANIZER_CONTACTS=organizer1@hackathon.com,organizer2@hackathon.com,organizer3@hackathon.com,organizer4@hackathon.com,organizer5@hackathon.com

# React App API URL
REACT_APP_API_URL=http://localhost:5000
```

**Important**: 
- Change `JWT_SECRET` to a strong random string in production
- Update `ORGANIZER_CONTACTS` with actual organizer contact information
- If using MongoDB Atlas, update `MONGODB_URI` with your connection string

### 5. Start MongoDB

**Local MongoDB:**
```bash
# On macOS with Homebrew:
brew services start mongodb-community

# On Linux:
sudo systemctl start mongod

# On Windows:
# Start MongoDB service from Services panel or run:
net start MongoDB
```

**MongoDB Atlas:**
- No local setup needed, just use your connection string in `.env`

### 6. Seed Initial Data

Run the seed script to create sample users, classrooms, teams, and members:

```bash
node server/scripts/seedData.js
```

This creates:
- 2 volunteer accounts (volunteer1, volunteer2)
- 1 coordinator account (coordinator)
- 1 organizer account (organizer)
- All 7 classrooms (004, 005, 202, 203, 205, 207, 208)
- 7-10 teams per classroom
- 3-5 members per team

**Default password for all accounts**: `password123`

### 7. Run the Application

**Option A: Run Both Server and Client Together (Recommended)**

```bash
npm run dev
```

This starts both the backend server (port 5000) and React frontend (port 3000) concurrently.

**Option B: Run Separately**

Terminal 1 - Backend:
```bash
npm run server
```

Terminal 2 - Frontend:
```bash
cd client
npm start
```

### 8. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## Usage Guide

### Login

Use the seeded accounts:
- **Volunteer**: `volunteer1` / `password123`
- **Coordinator**: `coordinator` / `password123`
- **Organizer**: `organizer` / `password123`

### Volunteer Workflow

1. **Login** → Enter credentials
2. **Select Classroom** → Choose from available rooms (004, 005, 202, 203, 205, 207, 208)
3. **Manage Attendance**:
   - Tap team names to expand and see members
   - Tap status buttons (Present, Absent, At Lunch, Sleeping, Left Campus) to update
   - Changes auto-save with timestamp
4. **Update Classroom Status** → Use status bar at top (Active, Lunch, Night, etc.)
5. **Quick Mode** → Switch to Quick Attendance for rapid updates during rush hours
6. **Report Issues** → Tap "Report Issue" button, select category, add description
7. **Critical Actions** → Use "Critical Action" button for emergencies or teams leaving

### Coordinator/Organizer Workflow

1. **Login** → Automatically redirected to dashboard
2. **View Overview** → See all classrooms in grid with real-time status
3. **Monitor Issues** → View and manage reported issues
4. **Handle Emergencies** → Acknowledge and track emergency alerts

## Project Structure

```
Hackathon_Management/
├── server/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── middleware/
│   │   └── auth.js               # JWT authentication
│   ├── models/
│   │   ├── User.js               # User model
│   │   ├── Classroom.js          # Classroom model
│   │   ├── Team.js               # Team model
│   │   ├── Member.js             # Member model
│   │   ├── Attendance.js         # Attendance log
│   │   ├── ClassroomStatus.js    # Status history
│   │   ├── Issue.js              # Issue reports
│   │   └── EmergencyLog.js       # Emergency logs
│   ├── routes/
│   │   ├── auth.js               # Authentication routes
│   │   ├── classrooms.js         # Classroom routes
│   │   ├── attendance.js         # Attendance routes
│   │   ├── issues.js             # Issue routes
│   │   ├── emergency.js          # Emergency routes
│   │   └── teams.js              # Team routes
│   ├── scripts/
│   │   └── seedData.js           # Database seeding
│   ├── utils/
│   │   └── socketEmitter.js      # Socket.io helpers
│   └── index.js                  # Server entry point
├── client/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── components/
│       │   └── PrivateRoute.js   # Protected routes
│       ├── context/
│       │   ├── AuthContext.js    # Auth state management
│       │   └── SocketContext.js  # Socket.io connection
│       ├── pages/
│       │   ├── Login.js
│       │   ├── ClassroomSelection.js
│       │   ├── AttendanceView.js
│       │   ├── QuickAttendanceMode.js
│       │   ├── IssueReporting.js
│       │   ├── EmergencyAction.js
│       │   └── CoordinatorDashboard.js
│       ├── App.js
│       └── index.js
├── .env.example                  # Environment template
├── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Classrooms
- `GET /api/classrooms` - Get all classrooms
- `GET /api/classrooms/:roomNumber` - Get single classroom
- `POST /api/classrooms/:roomNumber/status` - Update classroom status

### Attendance
- `POST /api/attendance/update` - Update member status
- `POST /api/attendance/bulk-update` - Bulk update (Quick Mode)

### Issues
- `POST /api/issues` - Create issue
- `GET /api/issues` - Get all issues
- `PATCH /api/issues/:id` - Update issue status

### Emergency
- `POST /api/emergency` - Create emergency log
- `GET /api/emergency` - Get all emergencies
- `PATCH /api/emergency/:id/acknowledge` - Acknowledge emergency

### Teams
- `GET /api/teams/classroom/:roomNumber` - Get teams for classroom

## Real-time Events (Socket.io)

### Client → Server
- `join-classroom` - Join classroom room for updates
- `join-dashboard` - Join coordinator dashboard

### Server → Client
- `classroom-status-updated` - Classroom status changed
- `attendance-updated` - Member attendance updated
- `attendance-bulk-updated` - Bulk attendance update
- `new-issue` - New issue reported
- `emergency-alert` - Emergency alert triggered
- `emergency-broadcast` - Emergency broadcast to all

## Production Deployment

### Environment Variables for Production

Update `.env` with production values:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=<your-production-mongodb-uri>
JWT_SECRET=<strong-random-secret>
CLIENT_URL=<your-frontend-url>
ORGANIZER_CONTACTS=<actual-organizer-contacts>
REACT_APP_API_URL=<your-backend-api-url>
```

### Build Frontend

```bash
cd client
npm run build
```

The built files will be in `client/build/`. Serve these with your production server or configure your backend to serve static files.

### Security Considerations

1. **Change JWT_SECRET** to a strong random string
2. **Use HTTPS** in production
3. **Set secure CORS** origins
4. **Enable MongoDB authentication**
5. **Use environment variables** for all secrets
6. **Implement rate limiting** for API endpoints
7. **Add input validation** and sanitization
8. **Set up proper logging** and monitoring

## Troubleshooting

### MongoDB Connection Issues

- Ensure MongoDB is running: `mongosh` or check service status
- Verify connection string in `.env`
- Check firewall settings if using remote MongoDB

### Port Already in Use

- Change `PORT` in `.env` for backend
- Change React default port: `PORT=3001 npm start` in client directory

### Socket.io Connection Issues

- Verify `CLIENT_URL` matches your frontend URL
- Check CORS settings in `server/index.js`
- Ensure both server and client are running

### Authentication Issues

- Clear browser localStorage: `localStorage.clear()`
- Verify JWT_SECRET is set correctly
- Check token expiration (default: 24 hours)

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs for errors
3. Verify all environment variables are set correctly
4. Ensure MongoDB is accessible

## License

This project is created for hackathon management purposes.

---

**Built with ❤️ for hackathon organizers and volunteers**

