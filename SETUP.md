# Quick Setup Guide

## Step-by-Step Local Setup

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 2. Setup MongoDB

**Option A: Local MongoDB**
- Install MongoDB: https://www.mongodb.com/try/download/community
- Start MongoDB service
- Default connection: `mongodb://localhost:27017/hackathon_management`

**Option B: MongoDB Atlas (Cloud)**
- Create free account: https://www.mongodb.com/cloud/atlas
- Create cluster and get connection string
- Use connection string in `.env`

### 3. Create Environment File

Create `.env` in root directory:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/hackathon_management
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
CLIENT_URL=http://localhost:3000
ORGANIZER_CONTACTS=organizer1@hackathon.com,organizer2@hackathon.com,organizer3@hackathon.com,organizer4@hackathon.com,organizer5@hackathon.com
REACT_APP_API_URL=http://localhost:5000
```

**Important**: Change `JWT_SECRET` to a random string!

### 4. Seed Database

```bash
npm run seed
```

This creates:
- Test users (volunteer1, coordinator, organizer)
- All 7 classrooms
- Sample teams and members

**Default password**: `password123`

### 5. Start Application

```bash
npm run dev
```

This starts:
- Backend server on http://localhost:5000
- Frontend on http://localhost:3000

### 6. Login

Open http://localhost:3000 and login with:
- Username: `volunteer1` or `coordinator` or `organizer`
- Password: `password123`

## What to Put in .env File

Copy this template and fill in your values:

```env
# Server port
PORT=5000

# Environment
NODE_ENV=development

# MongoDB connection string
# Local: mongodb://localhost:27017/hackathon_management
# Atlas: mongodb+srv://username:password@cluster.mongodb.net/hackathon_management
MONGODB_URI=mongodb://localhost:27017/hackathon_management

# JWT secret - CHANGE THIS to a random string!
JWT_SECRET=change_this_to_random_string_in_production

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:3000

# Organizer contacts for emergency alerts (comma-separated)
ORGANIZER_CONTACTS=organizer1@hackathon.com,organizer2@hackathon.com,organizer3@hackathon.com,organizer4@hackathon.com,organizer5@hackathon.com

# API URL for React app
REACT_APP_API_URL=http://localhost:5000
```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check connection string in `.env`
- Verify MongoDB port (default: 27017)

### Port 3000 or 5000 Already in Use
- Change `PORT` in `.env` for backend
- For frontend: `PORT=3001 npm start` in client directory

### Module Not Found Errors
- Run `npm install` in root
- Run `npm install` in client directory

### Authentication Issues
- Clear browser localStorage
- Verify JWT_SECRET is set
- Re-run seed script if users don't exist

## Next Steps

1. Test login with different user roles
2. Select a classroom as volunteer
3. Update attendance for team members
4. Try Quick Attendance Mode
5. Report an issue
6. Test emergency alert
7. Login as coordinator to see dashboard

## Production Deployment

For production:
1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET`
3. Use production MongoDB (Atlas recommended)
4. Update `CLIENT_URL` and `REACT_APP_API_URL` to production URLs
5. Build frontend: `cd client && npm run build`
6. Serve built files or configure backend to serve static files

