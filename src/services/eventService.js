const db = require('../db');
const emailService = require('./emailService');
const userService = require('./userService');

const eventService = {
  // Create a new hiking event
  createEvent: (eventData, userId) => {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO events (
                  name, description, location, startPoint, 
                  date, duration, difficulty, createdBy,
                  effortIPB, technicite, risques, 
                  altitudeMin, altitudeMax, denivele, visiorando,
                  distance
                  )
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                  
      db.run(sql, [
        eventData.name,
        eventData.description,
        eventData.location,
        eventData.startPoint,
        eventData.date,
        eventData.duration,
        eventData.difficulty,
        userId,
        eventData.effortIPB,
        eventData.technicite,
        eventData.risques,
        eventData.altitudeMin,
        eventData.altitudeMax,
        eventData.denivele,
        eventData.visiorando,
        eventData.distance
      ], function(err) {
        if (err) return reject(err);
        
        resolve({
          id: this.lastID,
          ...eventData,
          createdBy: userId
        });
      });
    });
  },
  
  // Get event by ID
  getEventById: (eventId) => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT e.*, 
                   u.firstName as creatorFirstName, 
                   u.lastName as creatorLastName
                   FROM events e
                   LEFT JOIN users u ON e.createdBy = u.id
                   WHERE e.id = ?`;
                   
      db.get(sql, [eventId], (err, event) => {
        if (err) return reject(err);
        if (!event) return resolve(null);
        
        // Get participants for this event
        const participantsSql = `
          SELECT p.status, u.id, u.firstName, u.lastName, u.profilePicture, p.status
          FROM participants p
          JOIN users u ON p.userId = u.id
          WHERE p.eventId = ?
        `;
        
        db.all(participantsSql, [eventId], (err, participants) => {
          if (err) return reject(err);
          
          event.participants = participants || [];
          resolve(event);
        });
      });
    });
  },
  
  // Get all events (with optional filtering)
  getEvents: (filters = {}) => {
    return new Promise((resolve, reject) => {
      let sql = `SELECT e.*, 
                u.firstName as creatorFirstName, 
                u.lastName as creatorLastName,
                (SELECT COUNT(*) FROM participants WHERE eventId = e.id) as participantCount
                FROM events e
                LEFT JOIN users u ON e.createdBy = u.id
                WHERE 1=1`;
                
      const params = [];
      
      // Add date filter
      if (filters.dateFrom) {
        sql += ` AND e.date >= ?`;
        params.push(filters.dateFrom);
      }
      
      if (filters.dateTo) {
        sql += ` AND e.date <= ?`;
        params.push(filters.dateTo);
      }
      
      // Add difficulty filter
      if (filters.difficulty) {
        sql += ` AND e.difficulty = ?`;
        params.push(filters.difficulty);
      }
      
      // Add sorting
      sql += ` ORDER BY e.date ASC`;
      
      db.all(sql, params, (err, events) => {
        if (err) return reject(err);
        resolve(events || []);
      });
    });
  },
  
  // Register user for an event
  registerParticipant: (eventId, userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(`Tentative d'inscription: utilisateur ${userId} à l'événement ${eventId}`);
        
        // Check if already registered
        db.get(
          'SELECT * FROM participants WHERE eventId = ? AND userId = ?',
          [eventId, userId],
          async (err, participant) => {
            if (err) {
              console.error('Error checking participation:', err);
              return reject(err);
            }
            
            if (participant) {
              console.log(`L'utilisateur ${userId} est déjà inscrit à l'événement ${eventId} avec le statut: ${participant.status}`);
              return reject(new Error('Vous êtes déjà inscrit à cet événement'));
            }
            
            // Register participant
            db.run(
              'INSERT INTO participants (eventId, userId, status) VALUES (?, ?, ?)',
              [eventId, userId, 'registered'],
              async function(err) {
                if (err) {
                  console.error('Error registering for event:', err);
                  return reject(err);
                }
                
                console.log(`Inscription réussie: utilisateur ${userId} à l'événement ${eventId}, ID: ${this.lastID}`);
                
                try {
                  // Get event and user details for email
                  console.log('Récupération des données pour l\'email...');
                  const event = await eventService.getEventById(eventId);
                  const user = await userService.getUserById(userId);
                  
                  console.log('Données pour email:', {
                    eventTrouvé: !!event,
                    userTrouvé: !!user
                  });
                  
                  // Send confirmation email
                  if (user && event) {
                    console.log(`Envoi d'un email de confirmation d'inscription à ${user.email} pour l'événement "${event.name}"`);
                    const emailResult = await emailService.sendEventRegistrationConfirmation(user, event);
                    console.log('Résultat de l\'envoi d\'email:', emailResult ? 'Succès' : 'Échec');
                  } else {
                    console.error('Impossible d\'envoyer l\'email: données utilisateur ou événement manquantes');
                  }
                  
                  resolve({
                    id: this.lastID,
                    userId,
                    eventId,
                    status: 'registered',
                    emailSent: emailResult
                  });
                } catch (error) {
                  console.error('Error sending registration confirmation email:', error);
                  // Still register the user even if email fails
                  resolve({
                    id: this.lastID,
                    userId,
                    eventId,
                    status: 'registered',
                    emailSent: false,
                    emailError: error.message
                  });
                }
              }
            );
          }
        );
      } catch (error) {
        console.error('Exception lors de l\'inscription:', error);
        reject(error);
      }
    });
  },
  
  // Cancel participation
  cancelParticipation: (eventId, userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if participation exists (without status constraint)
        db.get(
          'SELECT * FROM participants WHERE eventId = ? AND userId = ?',
          [eventId, userId],
          async (err, participant) => {
            if (err) {
              console.error('Error checking participation:', err);
              return reject(err);
            }
            
            if (!participant) {
              return reject(new Error('Participation non trouvée'));
            }
            
            // Si déjà annulé, on considère que c'est un succès
            if (participant.status === 'canceled') {
              return resolve({ success: true, alreadyCanceled: true });
            }
            
            // Cancel participation
            db.run(
              'UPDATE participants SET status = ? WHERE eventId = ? AND userId = ?',
              ['canceled', eventId, userId],
              async function(err) {
                if (err) {
                  console.error('Error canceling participation:', err);
                  return reject(err);
                }
                
                try {
                  // Get event and user details for email
                  const event = await eventService.getEventById(eventId);
                  const user = await userService.getUserById(userId);
                  
                  // Send cancellation email
                  if (user && event) {
                    console.log(`Envoi d'un email de confirmation d'annulation à ${user.email} pour l'événement "${event.name}"`);
                    emailService.sendEventCancellationConfirmation(user, event);
                  }
                  
                  resolve({ success: true });
                } catch (error) {
                  console.error('Error sending cancellation confirmation email:', error);
                  // Still cancel the participation even if email fails
                  resolve({ success: true });
                }
              }
            );
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  },
  
  // Notify all participants about a new event
  notifyAllUsers: async (eventId) => {
    try {
      // Get event details
      const event = await eventService.getEventById(eventId);
      if (!event) {
        throw new Error('Événement non trouvé');
      }
      
      // Get all participants with status 'registered'
      const sql = `
        SELECT p.id as participationId, u.id as userId, u.email, u.firstName, u.lastName
        FROM participants p
        JOIN users u ON p.userId = u.id
        WHERE p.eventId = ? AND p.status = 'registered'
      `;
      
      return new Promise((resolve, reject) => {
        db.all(sql, [eventId], async (err, participants) => {
          if (err) return reject(err);
          
          let successCount = 0;
          
          // Send notification to each participant
          for (const participant of participants) {
            try {
              await emailService.sendEventReminder({
                email: participant.email,
                firstName: participant.firstName,
                lastName: participant.lastName
              }, {
                id: event.id,
                name: event.name,
                date: event.date,
                location: event.location,
                startPoint: event.startPoint,
                description: event.description
              });
              
              successCount++;
            } catch (emailErr) {
              console.error(`Failed to send notification to ${participant.email}:`, emailErr);
              // Continue with other notifications even if one fails
            }
          }
          
          resolve({ count: successCount, total: participants.length });
        });
      });
    } catch (error) {
      console.error('Error in notifyAllUsers:', error);
      throw error;
    }
  }
};

module.exports = eventService; 