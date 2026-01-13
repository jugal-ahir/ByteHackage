const express = require('express');
const { testEmail } = require('../utils/emailService');
const auth = require('../middleware/auth');

const router = express.Router();

// Test email endpoint (for debugging)
router.post('/test', auth, async (req, res) => {
  try {
    // Only allow organizers/admins to test email
    if (req.user.role !== 'organizer' && req.user.role !== 'coordinator') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await testEmail();
    res.json(result);
  } catch (error) {
    console.error('Error testing email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

