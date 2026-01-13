const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: true,
    unique: true,
    enum: ['004', '005', '202', '203', '205', '207', '208']
  },
  currentStatus: {
    type: String,
    enum: ['active', 'lunch', 'night', 'emergency', 'jury', 'empty'],
    default: 'active'
  },
  bandColor: {
    name: { type: String, default: 'Gray' },
    hex: { type: String, default: '#6b7280' },
    bg: { type: String, default: '#f3f4f6' }
  },
  statusUpdatedAt: {
    type: Date,
    default: Date.now
  },
  statusUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Classroom', classroomSchema);

