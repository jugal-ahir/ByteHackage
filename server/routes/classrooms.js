const express = require('express');
const Classroom = require('../models/Classroom');
const ClassroomStatus = require('../models/ClassroomStatus');
const Team = require('../models/Team');
const Member = require('../models/Member');
const Attendance = require('../models/Attendance');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all classrooms with status
router.get('/', auth, async (req, res) => {
  try {
    const classrooms = await Classroom.find()
      .populate('teams')
      .sort({ roomNumber: 1 });

    // Auto-assign colors if missing (One-time migration logic)
    // Forced Color Mapping
    const ROOM_COLOR_MAPPING = {
      '004': { name: 'Green', hex: '#22c55e', bg: '#dcfce7' },
      '005': { name: 'Orange', hex: '#f97316', bg: '#ffedd5' },
      '202': { name: 'Silver', hex: '#9ca3af', bg: '#f3f4f6' }, // Silver/Gray
      '203': { name: 'Golden', hex: '#eab308', bg: '#fef9c3' }, // Golden/Yellow
      '205': { name: 'Yellow', hex: '#facc15', bg: '#fef08a' },
      '207': { name: 'Blue', hex: '#3b82f6', bg: '#dbeafe' },
      '208': { name: 'Red', hex: '#ef4444', bg: '#fee2e2' }
    };

    const BAND_COLORS = [
      { name: 'Red', hex: '#ef4444', bg: '#fee2e2' },
      { name: 'Blue', hex: '#3b82f6', bg: '#dbeafe' },
      { name: 'Green', hex: '#22c55e', bg: '#dcfce7' },
      { name: 'Yellow', hex: '#eab308', bg: '#fef9c3' },
      { name: 'Orange', hex: '#f97316', bg: '#ffedd5' },
      { name: 'Purple', hex: '#a855f7', bg: '#f3e8ff' },
      { name: 'Pink', hex: '#ec4899', bg: '#fce7f3' },
      { name: 'Teal', hex: '#14b8a6', bg: '#ccfbf1' },
      { name: 'Indigo', hex: '#6366f1', bg: '#e0e7ff' },
    ];

    for (const room of classrooms) {
      let shouldSave = false;
      const roomNumStr = room.roomNumber.toString();

      // Check for forced color
      if (ROOM_COLOR_MAPPING[roomNumStr]) {
        const forcedColor = ROOM_COLOR_MAPPING[roomNumStr];
        if (!room.bandColor || room.bandColor.name !== forcedColor.name) {
          room.bandColor = forcedColor;
          shouldSave = true;
        }
      }
      // Fallback for others if missing or Gray
      else if (!room.bandColor || room.bandColor.name === 'Gray') {
        const index = parseInt(room.roomNumber, 10) % BAND_COLORS.length;
        room.bandColor = BAND_COLORS[isNaN(index) ? 0 : index];
        shouldSave = true;
      }

      if (shouldSave) {
        await room.save();
      }
    }

    const classroomsWithDetails = await Promise.all(
      classrooms.map(async (classroom) => {
        const teams = await Team.find({ classroom: classroom._id })
          .populate('members');

        let presentCount = 0;
        let totalCount = 0;

        for (const team of teams) {
          for (const member of team.members) {
            totalCount++;
            if (member.currentStatus === 'present') {
              presentCount++;
            }
          }
        }

        return {
          ...classroom.toObject(),
          teams,
          presentCount,
          totalCount
        };
      })
    );

    res.json(classroomsWithDetails);
  } catch (error) {
    console.error('Error fetching classrooms:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single classroom with teams and members
router.get('/:roomNumber', auth, async (req, res) => {
  try {
    const classroom = await Classroom.findOne({ roomNumber: req.params.roomNumber })
      .populate({
        path: 'teams',
        populate: {
          path: 'members'
        }
      });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Find volunteers currently in this room
    const User = require('../models/User');
    const activeVolunteers = await User.find({
      currentRoom: req.params.roomNumber,
      role: 'volunteer'
    }).select('name');

    res.json({
      ...classroom.toObject(),
      activeVolunteers
    });
  } catch (error) {
    console.error('Error fetching classroom:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update classroom status
router.post('/:roomNumber/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const { roomNumber } = req.params;
    const io = req.app.get('io');

    const classroom = await Classroom.findOne({ roomNumber });
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    classroom.currentStatus = status;
    classroom.statusUpdatedAt = new Date();
    classroom.statusUpdatedBy = req.user._id;
    await classroom.save();

    // Log status change
    const statusLog = new ClassroomStatus({
      classroom: classroom._id,
      roomNumber,
      status,
      updatedBy: req.user._id,
      volunteerName: req.user.name
    });
    await statusLog.save();

    // Emit real-time updates
    if (io) {
      io.to(`classroom-${roomNumber}`).emit('classroom-status-updated', {
        roomNumber,
        status,
        updatedBy: req.user.name,
        timestamp: new Date()
      });
      io.to('coordinator-dashboard').emit('classroom-status-updated', {
        roomNumber,
        status,
        updatedBy: req.user.name,
        timestamp: new Date()
      });

      // Alert coordinators for emergency/medical
      if (status === 'emergency') {
        io.to('coordinator-dashboard').emit('emergency-alert', {
          roomNumber,
          type: 'emergency',
          reportedBy: req.user.name,
          timestamp: new Date()
        });
      }
    }

    res.json(classroom);
  } catch (error) {
    console.error('Error updating classroom status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update team gate entry status (and all members)
router.put('/:roomNumber/teams/:teamId/gate-entry', auth, async (req, res) => {
  try {
    const { isEntered, verificationType } = req.body;
    const { roomNumber, teamId } = req.params;
    const io = req.app.get('io');

    const team = await Team.findById(teamId).populate('members');
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Preserve original enteredAt if already entered
    const originalEnteredAt = team.gateEntry?.enteredAt;
    const originalIsEntered = team.gateEntry?.isEntered;

    // Update Team
    team.gateEntry = {
      isEntered,
      enteredAt: isEntered ? (originalIsEntered ? originalEnteredAt : new Date()) : null,
      markedBy: req.user._id,
      markedByName: req.user.name,
      verificationType: verificationType || 'Nothing'
    };

    // Sync Members
    if (team.members) {
      for (const member of team.members) {
        const mOriginalIsEntered = member.gateEntry?.isEntered;
        const mOriginalEnteredAt = member.gateEntry?.enteredAt;
        member.gateEntry = {
          isEntered,
          enteredAt: isEntered ? (mOriginalIsEntered ? mOriginalEnteredAt : new Date()) : null,
          verificationType: verificationType || 'Nothing'
        };
        await member.save();
      }
    }

    await team.save();

    // Emit real-time update
    if (io) {
      const eventData = {
        roomNumber,
        teamId,
        gateEntry: team.gateEntry,
        members: team.members.map(m => ({ _id: m._id, gateEntry: m.gateEntry }))
      };
      io.to(`classroom-${roomNumber}`).emit('gate-entry-updated', eventData);
      io.to('coordinator-dashboard').emit('gate-entry-updated', eventData);
    }

    res.json(team);
  } catch (error) {
    console.error('Error updating gate entry:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Member Gate Entry
router.put('/:roomNumber/teams/:teamId/members/:memberId/gate-entry', auth, async (req, res) => {
  try {
    const { isEntered, verificationType } = req.body;
    const { roomNumber, teamId, memberId } = req.params;
    const io = req.app.get('io');

    const member = await Member.findById(memberId);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const originalIsEntered = member.gateEntry?.isEntered;
    const originalEnteredAt = member.gateEntry?.enteredAt;

    member.gateEntry = {
      isEntered,
      enteredAt: isEntered ? (originalIsEntered ? originalEnteredAt : new Date()) : null,
      verificationType: verificationType || 'Nothing'
    };
    await member.save();

    // Check Team Status
    const team = await Team.findById(teamId).populate('members');
    const allEntered = team.members.every(m => m.gateEntry?.isEntered);

    let teamUpdated = false;
    // If all entered, mark team entered. If not all entered, mark team NOT entered.
    if (allEntered && !team.gateEntry?.isEntered) {
      team.gateEntry = {
        isEntered: true,
        enteredAt: new Date(),
        markedBy: req.user._id,
        markedByName: req.user.name
      };
      teamUpdated = true;
    } else if (!allEntered && team.gateEntry?.isEntered) {
      team.gateEntry = { ...team.gateEntry, isEntered: false };
      teamUpdated = true;
    }

    if (teamUpdated) await team.save();

    if (io) {
      const eventData = {
        roomNumber,
        teamId,
        gateEntry: team.gateEntry,
        memberId: member._id,
        memberGateEntry: member.gateEntry
      };
      io.to(`classroom-${roomNumber}`).emit('gate-entry-updated', eventData);
      io.to('coordinator-dashboard').emit('gate-entry-updated', eventData);
    }

    res.json({ member, teamComp: team.gateEntry });
  } catch (error) {
    console.error('Error updating member gate entry:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

