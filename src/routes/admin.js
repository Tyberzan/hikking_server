const express = require('express');
const router = express.Router();
const db = require('../db');

// @route   GET /api/admin/db/users
// @desc    Get all users from database
// @access  Public (for testing purposes only, should be secured in production)
router.get('/db/users', (req, res) => {
  db.all(`SELECT id, email, firstName, lastName, profilePicture, verificationCode, isVerified, createdAt FROM users`, [], (err, rows) => {
    if (err) {
      console.error('Error getting users:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// @route   GET /api/admin/db/events
// @desc    Get all events from database
// @access  Public (for testing purposes only, should be secured in production)
router.get('/db/events', (req, res) => {
  db.all(`SELECT * FROM events`, [], (err, rows) => {
    if (err) {
      console.error('Error getting events:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// @route   GET /api/admin/db/participants
// @desc    Get all participants from database
// @access  Public (for testing purposes only, should be secured in production)
router.get('/db/participants', (req, res) => {
  db.all(`SELECT * FROM participants`, [], (err, rows) => {
    if (err) {
      console.error('Error getting participants:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

module.exports = router; 