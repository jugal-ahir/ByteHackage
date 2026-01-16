const express = require('express');
const Member = require('../models/Member');
const Attendance = require('../models/Attendance');
const Team = require('../models/Team');
const Classroom = require('../models/Classroom');
const auth = require('../middleware/auth');

const router = express.Router();

// Update member status
router.post('/update', auth, async (req, res) => {
  try {
    const { memberId, status, roomNumber, teamName } = req.body;

    const member = await Member.findById(memberId).populate('team');
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const team = await Team.findById(member.team._id).populate('classroom');
    const classroom = await Classroom.findById(team.classroom._id);

    // Skip if blocked
    if (member.currentStatus === 'blocked') {
      return res.status(403).json({ message: 'Cannot update status of a blocked member' });
    }

    // Update member status
    member.currentStatus = status;
    member.statusHistory.push({
      status,
      timestamp: new Date(),
      updatedBy: req.user._id,
      roomNumber: roomNumber || classroom.roomNumber,
      teamName: teamName || team.teamName
    });
    await member.save();

    // Create attendance record
    const attendance = new Attendance({
      member: member._id,
      team: team._id,
      classroom: classroom._id,
      status,
      updatedBy: req.user._id,
      roomNumber: roomNumber || classroom.roomNumber,
      teamName: teamName || team.teamName,
      memberName: member.name,
      volunteerName: req.user.name
    });
    await attendance.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`classroom-${roomNumber || classroom.roomNumber}`).emit('attendance-updated', {
        memberId: member._id,
        memberName: member.name,
        teamName: teamName || team.teamName,
        status,
        timestamp: new Date()
      });
      io.to('coordinator-dashboard').emit('attendance-updated', {
        roomNumber: roomNumber || classroom.roomNumber,
        memberId: member._id,
        memberName: member.name,
        teamName: teamName || team.teamName,
        status,
        timestamp: new Date()
      });
    }

    res.json({ success: true, member, attendance });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk update team attendance (Quick Mode)
router.post('/bulk-update', auth, async (req, res) => {
  try {
    const { updates, roomNumber } = req.body; // updates: [{teamId, presentCount, totalCount, members: [{memberId, status}]}]

    const results = [];

    for (const update of updates) {
      const { teamId, members } = update;
      const team = await Team.findById(teamId).populate('classroom');

      if (!team) continue;

      for (const memberUpdate of members) {
        const { memberId, status } = memberUpdate;
        const member = await Member.findById(memberId);

        if (!member) continue;

        // Skip if blocked - cannot change status of members blocked during gate entry
        if (member.currentStatus === 'blocked') continue;

        member.currentStatus = status;
        member.statusHistory.push({
          status,
          timestamp: new Date(),
          updatedBy: req.user._id,
          roomNumber: roomNumber || team.classroom.roomNumber,
          teamName: team.teamName
        });
        await member.save();

        const attendance = new Attendance({
          member: member._id,
          team: team._id,
          classroom: team.classroom._id,
          status,
          updatedBy: req.user._id,
          roomNumber: roomNumber || team.classroom.roomNumber,
          teamName: team.teamName,
          memberName: member.name,
          volunteerName: req.user.name
        });
        await attendance.save();

        results.push({ memberId, status });
      }
    }

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`classroom-${roomNumber}`).emit('attendance-bulk-updated', {
        roomNumber,
        updates: results,
        timestamp: new Date()
      });
      io.to('coordinator-dashboard').emit('attendance-bulk-updated', {
        roomNumber,
        updates: results,
        timestamp: new Date()
      });
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Error bulk updating attendance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

