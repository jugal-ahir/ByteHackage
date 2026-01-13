const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['volunteer', 'coordinator', 'organizer'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  assignedClassrooms: [{
    type: String,
    enum: ['004', '005', '202', '203', '205', '207', '208']
  }],
  currentRoom: {
    type: String,
    enum: ['004', '005', '202', '203', '205', '207', '208', null],
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

