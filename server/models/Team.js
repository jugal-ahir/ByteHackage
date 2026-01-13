const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: true
  },
  classroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  gateEntry: {
    isEntered: { type: Boolean, default: false },
    enteredAt: { type: Date },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    markedByName: String,
    verificationType: {
      type: String,
      enum: ['Bonafide', 'ID Card', 'Nothing'],
      default: 'Nothing'
    }
  }
});

module.exports = mongoose.model('Team', teamSchema);

