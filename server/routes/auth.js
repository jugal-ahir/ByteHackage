const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        assignedClassrooms: user.assignedClassrooms,
        currentRoom: user.currentRoom
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      assignedClassrooms: user.assignedClassrooms,
      currentRoom: user.currentRoom
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Select current room
router.post('/select-room', auth, async (req, res) => {
  try {
    const { roomNumber } = req.body;

    // roomNumber can be null if clearing selection
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.currentRoom = roomNumber;
    await user.save();

    // Emit real-time update to administrators
    const io = req.app.get('io');
    if (io) {
      io.to('coordinator-dashboard').emit('volunteer-room-updated', {
        volunteerId: user._id,
        volunteerName: user.name,
        roomNumber
      });
    }

    res.json({ success: true, currentRoom: user.currentRoom });
  } catch (error) {
    console.error('Select room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

