const mongoose = require('mongoose');

const classroomStatusSchema = new mongoose.Schema({
  classroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: true
  },
  roomNumber: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'lunch', 'night', 'emergency', 'jury', 'empty'],
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
  volunteerName: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('ClassroomStatus', classroomStatusSchema);

