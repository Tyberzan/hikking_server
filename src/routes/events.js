const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const eventService = require('../services/eventService');

// @route   POST /api/events
// @desc    Create a new hiking event
// @access  Private
router.post(
  '/',
  [
    auth,
    body('name', 'Le nom est requis').notEmpty(),
    body('location', 'Le lieu est requis').notEmpty(),
    body('startPoint', 'Le point de départ est requis').notEmpty(),
    body('date', 'La date est requise').notEmpty().isISO8601().withMessage('Format de date invalide'),
    body('duration', 'La durée doit être un nombre').optional().isNumeric(),
    body('difficulty', 'La difficulté doit être facile, moyenne ou difficile').optional().isIn(['facile', 'moyenne', 'difficile'])
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Create event
      const newEvent = await eventService.createEvent(req.body, req.user.id);
      
      // Optional: notify all users about new event
      if (req.body.notifyUsers) {
        eventService.notifyAllUsers(newEvent.id);
      }
      
      res.status(201).json({
        success: true,
        message: 'Événement créé avec succès',
        event: newEvent
      });
    } catch (error) {
      console.error('Error creating event:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
);

// @route   GET /api/events
// @desc    Get all hiking events with filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Prepare filters from query params
    const filters = {};
    
    if (req.query.dateFrom) {
      filters.dateFrom = req.query.dateFrom;
    }
    
    if (req.query.dateTo) {
      filters.dateTo = req.query.dateTo;
    }
    
    if (req.query.difficulty) {
      filters.difficulty = req.query.difficulty;
    }
    
    const events = await eventService.getEvents(filters);
    res.json(events);
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @route   GET /api/events/:id
// @desc    Get a specific event by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }
    
    res.json(event);
  } catch (error) {
    console.error('Error getting event:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @route   POST /api/events/:id/register
// @desc    Register current user for an event
// @access  Private
router.post('/:id/register', auth, async (req, res) => {
  try {
    // Check if event exists
    const event = await eventService.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }
    
    // Check if event date is in the past
    if (new Date(event.date) < new Date()) {
      return res.status(400).json({ message: 'Impossible de s\'inscrire à un événement passé' });
    }
    
    // Register user for the event
    await eventService.registerParticipant(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: 'Inscription réussie'
    });
  } catch (error) {
    console.error('Error registering for event:', error);
    if (error.message === 'Vous êtes déjà inscrit à cet événement') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @route   POST /api/events/:id/cancel
// @desc    Cancel participation in an event
// @access  Private
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    // Check if event exists
    const event = await eventService.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }
    
    // Cancel participation
    await eventService.cancelParticipation(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: 'Participation annulée avec succès'
    });
  } catch (error) {
    console.error('Error canceling participation:', error);
    if (error.message === 'Participation non trouvée ou déjà annulée') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @route   GET /api/events/:id/participants
// @desc    Get participants for an event
// @access  Public
router.get('/:id/participants', async (req, res) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }
    
    res.json(event.participants);
  } catch (error) {
    console.error('Error getting event participants:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router; 