const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['medical', 'technical', 'power', 'food', 'security', 'discipline', 'equipment'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  roomNumber: {
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
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved'],
    default: 'open'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

module.exports = mongoose.model('Issue', issueSchema);

