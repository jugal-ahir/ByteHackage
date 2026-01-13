const express = require('express');
const EmergencyLog = require('../models/EmergencyLog');
const auth = require('../middleware/auth');
const { sendEmergencyEmail } = require('../utils/emailService');

const router = express.Router();

// Create emergency log
router.post('/', auth, async (req, res) => {
  try {
    const { type, roomNumber, teamName, description } = req.body;

    // Get organizer emails/contacts from env
    // Always include jugal.v@ahduni.edu.in
    const defaultContacts = ['jugal.v@ahduni.edu.in'];
    const envContacts = process.env.ORGANIZER_CONTACTS
      ? process.env.ORGANIZER_CONTACTS.split(',').map(e => e.trim()).filter(e => e)
      : [];
    const organizerContacts = [...new Set([...defaultContacts, ...envContacts])];

    console.log('📧 Sending emails to:', organizerContacts.join(', '));

    const emergencyLog = new EmergencyLog({
      type,
      roomNumber,
      teamName,
      description,
      reportedBy: req.user._id,
      volunteerName: req.user.name,
      notifiedOrganizers: organizerContacts
    });

    await emergencyLog.save();

    // Emit real-time emergency alert
    const io = req.app.get('io');
    if (io) {
      io.to('coordinator-dashboard').emit('emergency-alert', {
        type,
        roomNumber,
        teamName,
        description,
        reportedBy: req.user.name,
        timestamp: new Date(),
        logId: emergencyLog._id
      });
      io.emit('emergency-broadcast', {
        type,
        roomNumber,
        teamName,
        reportedBy: req.user.name,
        timestamp: new Date()
      });
    }

    // Send email notifications
    const emailResult = await sendEmergencyEmail({
      type,
      roomNumber,
      teamName,
      description,
      volunteerName: req.user.name,
      organizerContacts
    });

    if (!emailResult.success) {
      console.log('❌ Email sending failed:', emailResult.message || emailResult.error);
      console.log('Email error details:', emailResult);
    } else {
      console.log('✅ Email sent successfully to:', organizerContacts.join(', '));
    }

    console.log(`\n🚨 EMERGENCY ALERT: ${type} in room ${roomNumber}`);
    console.log(`📧 Notifying organizers: ${organizerContacts.join(', ')}`);
    console.log(`👤 Reported by: ${req.user.name}`);
    console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);

    res.json({
      success: true,
      emergencyLog,
      emailSent: emailResult.success,
      emailError: emailResult.error || null
    });
  } catch (error) {
    console.error('Error creating emergency log:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all emergency logs
router.get('/', auth, async (req, res) => {
  try {
    const logs = await EmergencyLog.find()
      .populate('reportedBy', 'name username')
      .populate('acknowledgedBy', 'name username')
      .sort({ timestamp: -1 })
      .lean();

    // Add volunteerName if not populated
    const logsWithNames = logs.map(log => ({
      ...log,
      volunteerName: log.volunteerName || log.reportedBy?.name || 'Unknown'
    }));

    res.json(logsWithNames);
  } catch (error) {
    console.error('Error fetching emergency logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Acknowledge emergency
router.patch('/:id/acknowledge', auth, async (req, res) => {
  try {
    const log = await EmergencyLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ message: 'Emergency log not found' });
    }

    log.acknowledged = true;
    log.acknowledgedBy = req.user._id;
    await log.save();

    res.json(log);
  } catch (error) {
    console.error('Error acknowledging emergency:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete emergency log
router.delete('/:id', auth, async (req, res) => {
  try {
    const log = await EmergencyLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ message: 'Emergency log not found' });
    }

    await EmergencyLog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Emergency log deleted successfully' });
  } catch (error) {
    console.error('Error deleting emergency:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

