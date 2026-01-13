const express = require('express');
const Classroom = require('../models/Classroom');
const Team = require('../models/Team');
const Member = require('../models/Member');
const auth = require('../middleware/auth');

const router = express.Router();

// Middleware to check if user is organizer
const isOrganizer = (req, res, next) => {
  if (req.user.role !== 'organizer') {
    return res.status(403).json({ message: 'Access denied. Organizer role required.' });
  }
  next();
};

// Add team to classroom
router.post('/rooms/:roomNumber/teams', auth, isOrganizer, async (req, res) => {
  try {
    const { roomNumber } = req.params;
    const { teamName, members } = req.body;

    if (!teamName || !members || members.length === 0) {
      return res.status(400).json({ message: 'Team name and at least one member required' });
    }

    const classroom = await Classroom.findOne({ roomNumber });
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Create team
    const team = new Team({
      teamName: teamName.trim(),
      classroom: classroom._id
    });
    await team.save();

    // Create members
    const memberIds = [];
    for (const memberName of members) {
      if (memberName.trim()) {
        const member = new Member({
          name: memberName.trim(),
          team: team._id,
          currentStatus: 'present',
          statusHistory: [{
            status: 'present',
            timestamp: new Date(),
            roomNumber,
            teamName: team.teamName
          }]
        });
        await member.save();
        memberIds.push(member._id);
      }
    }

    team.members = memberIds;
    await team.save();

    // Update classroom
    classroom.teams.push(team._id);
    await classroom.save();

    const populatedTeam = await Team.findById(team._id).populate('members');

    res.json({ success: true, team: populatedTeam });
  } catch (error) {
    console.error('Error adding team:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete team
router.delete('/teams/:teamId', auth, isOrganizer, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId).populate('classroom');
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Delete all members
    await Member.deleteMany({ team: team._id });

    // Remove team from classroom
    const classroom = await Classroom.findById(team.classroom._id);
    if (classroom) {
      classroom.teams = classroom.teams.filter(t => t.toString() !== team._id.toString());
      await classroom.save();
    }

    // Delete team
    await Team.findByIdAndDelete(team._id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete member
router.delete('/members/:memberId', auth, isOrganizer, async (req, res) => {
  try {
    const member = await Member.findById(req.params.memberId).populate('team');
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const teamId = member.team._id;

    // Delete member
    await Member.findByIdAndDelete(member._id);

    // Remove member from team
    const team = await Team.findById(teamId);
    if (team) {
      team.members = team.members.filter(m => m.toString() !== member._id.toString());
      await team.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add member to existing team
router.post('/teams/:teamId/members', auth, isOrganizer, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Member name required' });
    }

    const team = await Team.findById(teamId).populate('classroom');
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const member = new Member({
      name: name.trim(),
      team: team._id,
      currentStatus: 'present',
      statusHistory: [{
        status: 'present',
        timestamp: new Date(),
        roomNumber: team.classroom?.roomNumber,
        teamName: team.teamName
      }]
    });
    await member.save();

    team.members.push(member._id);
    await team.save();

    res.json({ success: true, member });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

