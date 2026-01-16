const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  classroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'lunch', 'sleeping', 'left', 'blocked'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roomNumber: {
    type: String,
    required: true
  },
  teamName: {
    type: String,
    required: true
  },
  memberName: {
    type: String,
    required: true
  },
  volunteerName: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Attendance', attendanceSchema);

