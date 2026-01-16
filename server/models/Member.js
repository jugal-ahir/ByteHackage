const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  currentStatus: {
    type: String,
    enum: ['present', 'absent', 'lunch', 'sleeping', 'left', 'blocked'],
    default: 'present'
  },
  gateEntry: {
    isEntered: { type: Boolean, default: false },
    enteredAt: Date,
    verificationType: {
      type: String,
      enum: ['Bonafide', 'ID Card', 'Nothing'],
      default: 'Nothing'
    }
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['present', 'absent', 'lunch', 'sleeping', 'left', 'blocked']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    roomNumber: String,
    teamName: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Member', memberSchema);

