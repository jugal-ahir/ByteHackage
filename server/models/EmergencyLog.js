const mongoose = require('mongoose');

const emergencyLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['team-leaving', 'team-missing', 'emergency', 'medical'],
    required: true
  },
  roomNumber: {
    type: String,
    required: true
  },
  teamName: {
    type: String
  },
  description: {
    type: String,
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  volunteerName: {
    type: String,
    required: true
  },
  notifiedOrganizers: [{
    type: String
  }],
  timestamp: {
    type: Date,
    default: Date.now
  },
  acknowledged: {
    type: Boolean,
    default: false
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

module.exports = mongoose.model('EmergencyLog', emergencyLogSchema);

