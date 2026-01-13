const express = require('express');
const Team = require('../models/Team');
const Member = require('../models/Member');
const Classroom = require('../models/Classroom');
const auth = require('../middleware/auth');

const router = express.Router();

// Get teams for a classroom
router.get('/classroom/:roomNumber', auth, async (req, res) => {
  try {
    const classroom = await Classroom.findOne({ roomNumber: req.params.roomNumber });
    
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    const teams = await Team.find({ classroom: classroom._id })
      .populate('members')
      .sort({ teamName: 1 });

    // Add present/total counts
    const teamsWithCounts = teams.map(team => {
      const totalCount = team.members.length;
      const presentCount = team.members.filter(m => m.currentStatus === 'present').length;
      
      return {
        ...team.toObject(),
        presentCount,
        totalCount
      };
    });

    res.json(teamsWithCounts);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

