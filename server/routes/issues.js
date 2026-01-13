const express = require('express');
const Issue = require('../models/Issue');
const auth = require('../middleware/auth');

const router = express.Router();

// Create issue
router.post('/', auth, async (req, res) => {
  try {
    const { category, description, roomNumber } = req.body;

    const issue = new Issue({
      category,
      description,
      roomNumber,
      reportedBy: req.user._id,
      volunteerName: req.user.name
    });

    await issue.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to('coordinator-dashboard').emit('new-issue', {
        issue: await Issue.findById(issue._id).populate('reportedBy', 'name username')
      });
      io.to(`classroom-${roomNumber}`).emit('issue-reported', {
        category,
        roomNumber,
        timestamp: new Date()
      });
    }

    res.json(issue);
  } catch (error) {
    console.error('Error creating issue:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all issues
router.get('/', auth, async (req, res) => {
  try {
    const issues = await Issue.find()
      .populate('reportedBy', 'name username')
      .populate('resolvedBy', 'name username')
      .sort({ timestamp: -1 });
    
    res.json(issues);
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update issue status
router.patch('/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    issue.status = status;
    if (status === 'resolved') {
      issue.resolvedAt = new Date();
      issue.resolvedBy = req.user._id;
    }

    await issue.save();
    res.json(issue);
  } catch (error) {
    console.error('Error updating issue:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete issue
router.delete('/:id', auth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    await Issue.findByIdAndDelete(req.params.id);
    res.json({ message: 'Issue deleted successfully' });
  } catch (error) {
    console.error('Error deleting issue:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

