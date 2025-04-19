const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const eventService = require('../services/eventService');
const db = require('../db');
const userService = require('../services/userService');
const emailService = require('../services/emailService');

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
    body('difficulty', 'La difficulté doit être facile, moyenne ou difficile').optional().isIn(['facile', 'moyenne', 'difficile']),
    // Validation des nouveaux champs
    body('effortIPB', 'L\'effort IPB doit être un nombre entre 1 et 5').optional().isInt({ min: 1, max: 200 }),
    body('technicite', 'La technicité doit être un nombre entre 1 et 5').optional().isInt({ min: 1, max: 5 }),
    body('risques', 'Les risques doivent être un nombre entre 1 et 5').optional().isInt({ min: 1, max: 5 }),
    body('altitudeMin', 'L\'altitude minimum doit être un nombre positif').optional().isInt({ min: 0 }),
    body('altitudeMax', 'L\'altitude maximum doit être un nombre positif').optional().isInt({ min: 0 }),
    body('denivele', 'Le dénivelé doit être un nombre positif').optional().isInt({ min: 0 }),
    body('visiorando', 'Le lien Visiorando est invalide').optional(),
    body('distance', 'La distance doit être un nombre positif').optional().isFloat({ min: 0 })
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
// @desc    Register for an event
// @access  Private
router.post('/:id/register', auth, async (req, res) => {
  try {
    // Check if event exists
    const event = await eventService.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }
    
    // Vérifier si l'utilisateur est déjà inscrit mais a annulé
    db.get(
      'SELECT * FROM participants WHERE eventId = ? AND userId = ?',
      [req.params.id, req.user.id],
      async (err, participant) => {
        if (err) {
          console.error('Error checking existing participation:', err);
          return res.status(500).json({ message: 'Erreur serveur lors de la vérification de l\'inscription' });
        }
        
        // Si l'utilisateur a déjà une participation et qu'elle est annulée, la réactiver
        if (participant && participant.status === 'canceled') {
          db.run(
            'UPDATE participants SET status = ? WHERE eventId = ? AND userId = ?',
            ['registered', req.params.id, req.user.id],
            async function(err) {
              if (err) {
                console.error('Error restoring registration:', err);
                return res.status(500).json({ message: 'Erreur serveur lors de la réactivation de l\'inscription' });
              }
              
              // Récupérer les détails utilisateur pour l'email
              const user = await userService.getUserById(req.user.id);
              console.log('Utilisateur récupéré pour email:', user ? 'Trouvé' : 'Non trouvé');
              
              // Envoyer un email de confirmation de réactivation
              if (user) {
                console.log('Tentative d\'envoi d\'email de réactivation d\'inscription');
                const emailSent = await emailService.sendEventRegistrationConfirmation(user, event);
                console.log('Résultat de l\'envoi d\'email de réactivation:', emailSent ? 'Succès' : 'Échec');
              }
              
              return res.json({
                success: true,
                message: 'Inscription réactivée avec succès'
              });
            }
          );
        } else {
          // Sinon, tentative d'inscription normale
          try {
            const registrationResult = await eventService.registerParticipant(req.params.id, req.user.id);
            console.log('Résultat de l\'inscription:', registrationResult);
            
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
        }
      }
    );
  } catch (error) {
    console.error('Error registering for event:', error);
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
    const result = await eventService.cancelParticipation(req.params.id, req.user.id);
    
    // Si la participation était déjà annulée
    if (result.alreadyCanceled) {
      return res.json({
        success: true,
        message: 'Cette inscription était déjà annulée'
      });
    }
    
    res.json({
      success: true,
      message: 'Participation annulée avec succès'
    });
  } catch (error) {
    console.error('Error canceling participation:', error);
    if (error.message === 'Participation non trouvée') {
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
    // Requête pour obtenir les participants avec leurs informations complètes
    const sql = `
      SELECT u.id, u.firstName, u.lastName, u.email, u.profilePicture, p.status, p.registeredAt 
      FROM participants p
      JOIN users u ON p.userId = u.id
      WHERE p.eventId = ?
      ORDER BY p.registeredAt ASC
    `;
    
    db.all(sql, [req.params.id], (err, participants) => {
      if (err) {
        console.error('Error getting event participants:', err);
        return res.status(500).json({ message: 'Erreur serveur lors de la récupération des participants' });
      }
      
      console.log(`DEBUG: Récupération de ${participants.length} participants pour l'événement ${req.params.id}`);
      
      // Pour chaque participant, ne pas envoyer l'email complet pour protéger la vie privée
      const safeParticipants = participants.map(p => {
        // Masquer l'email complet sauf pour la première partie avant @
        let maskedEmail = '';
        if (p.email) {
          const parts = p.email.split('@');
          if (parts.length === 2) {
            maskedEmail = `${parts[0]}@****`;
          }
        }
        
        return {
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          email: maskedEmail,
          profilePicture: p.profilePicture,
          status: p.status,
          registeredAt: p.registeredAt
        };
      });
      
      res.json(safeParticipants);
    });
  } catch (error) {
    console.error('Error getting event participants:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @route   POST /api/events/:id/notify
// @desc    Manually trigger notifications for an event
// @access  Private
router.post('/:id/notify', auth, async (req, res) => {
  try {
    // Check if user is an admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Accès non autorisé. Privilèges administrateur requis.' });
    }

    // Check if event exists
    const event = await eventService.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }
    
    // Trigger notifications
    const notificationResult = await eventService.notifyAllUsers(req.params.id);
    
    res.json({
      success: true,
      message: 'Notifications envoyées avec succès',
      notificationsSent: notificationResult.count
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'envoi des notifications' });
  }
});

// @route   PUT /api/events/:id
// @desc    Update an event
// @access  Private (admin only)
router.put(
  '/:id',
  [
    auth,
    body('name', 'Le nom est requis').notEmpty(),
    body('location', 'Le lieu est requis').notEmpty(),
    body('startPoint', 'Le point de départ est requis').notEmpty(),
    body('date', 'La date est requise').notEmpty().isISO8601().withMessage('Format de date invalide'),
    body('duration', 'La durée doit être un nombre').optional().isNumeric(),
    body('difficulty', 'La difficulté doit être facile, moyenne ou difficile').optional().isIn(['facile', 'moyenne', 'difficile']),
    // Validation des champs techniques
    body('effortIPB', 'L\'effort IPB doit être un nombre entre 1 et 5').optional().isInt({ min: 1, max: 200 }),
    body('technicite', 'La technicité doit être un nombre entre 1 et 5').optional().isInt({ min: 1, max: 5 }),
    body('risques', 'Les risques doivent être un nombre entre 1 et 5').optional().isInt({ min: 1, max: 5 }),
    body('altitudeMin', 'L\'altitude minimum doit être un nombre positif').optional().isInt({ min: 0 }),
    body('altitudeMax', 'L\'altitude maximum doit être un nombre positif').optional().isInt({ min: 0 }),
    body('denivele', 'Le dénivelé doit être un nombre positif').optional().isInt({ min: 0 }),
    body('visiorando', 'Le lien Visiorando est invalide').optional(),
    body('distance', 'La distance doit être un nombre positif').optional().isFloat({ min: 0 })
  ],
  async (req, res) => {
    // Vérifier les droits d'admin
    if (!req.user.admin && !req.user.superAdmin) {
      return res.status(403).json({ message: 'Accès non autorisé. Privilèges administrateur requis.' });
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Vérifier si l'événement existe
      const eventId = req.params.id;
      const event = await eventService.getEventById(eventId);
      
      if (!event) {
        return res.status(404).json({ message: 'Événement non trouvé' });
      }
      
      // Mettre à jour l'événement dans la base de données
      const updateFields = [
        'name', 'location', 'startPoint', 'date', 'duration', 'difficulty', 'description',
        'effortIPB', 'technicite', 'risques', 'altitudeMin', 'altitudeMax', 'denivele', 
        'visiorando', 'distance'
      ];
      
      const updateData = {};
      updateFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });
      
      // Créer la requête SQL dynamique
      const fieldsToUpdate = Object.keys(updateData).map(field => `${field} = ?`).join(', ');
      const values = Object.values(updateData);
      
      // Ajouter l'ID de l'événement à la fin du tableau de valeurs
      values.push(eventId);
      
      return new Promise((resolve, reject) => {
        const sql = `UPDATE events SET ${fieldsToUpdate} WHERE id = ?`;
        
        db.run(sql, values, function(err) {
          if (err) {
            console.error('Error updating event:', err);
            return res.status(500).json({ message: 'Erreur serveur' });
          }
          
          if (this.changes === 0) {
            return res.status(404).json({ message: 'Événement non trouvé ou aucune modification effectuée' });
          }
          
          res.json({
            success: true,
            message: 'Événement mis à jour avec succès',
            eventId
          });
        });
      });
      
    } catch (error) {
      console.error('Error updating event:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
);

module.exports = router; 