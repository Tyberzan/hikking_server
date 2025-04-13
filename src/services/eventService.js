const db = require('../db');
const emailService = require('./emailService');
const userService = require('./userService');

const eventService = {
  // Create a new hiking event
  createEvent: (eventData, userId) => {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO events (name, description, location, startPoint, date, duration, difficulty, createdBy)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                  
      db.run(sql, [
        eventData.name,
        eventData.description,
        eventData.location,
        eventData.startPoint,
        eventData.date,
        eventData.duration,
        eventData.difficulty,
        userId
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
          SELECT p.status, u.id, u.firstName, u.lastName, u.profilePicture
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
        // Check if already registered
        const checkSql = `SELECT * FROM participants WHERE userId = ? AND eventId = ?`;
        
        db.get(checkSql, [userId, eventId], async (err, participant) => {
          if (err) return reject(err);
          
          if (participant) {
            return reject(new Error('Vous êtes déjà inscrit à cet événement'));
          }
          
          // Register participant
          const sql = `INSERT INTO participants (userId, eventId, status) VALUES (?, ?, 'registered')`;
          
          db.run(sql, [userId, eventId], async function(err) {
            if (err) return reject(err);
            
            try {
              // Get event and user details for email
              const event = await eventService.getEventById(eventId);
              const user = await userService.getUserById(userId);
              
              // Send confirmation email
              await emailService.sendEventReminder(user, event);
              
              resolve({
                id: this.lastID,
                userId,
                eventId,
                status: 'registered'
              });
            } catch (error) {
              // Still register the user even if email fails
              console.error('Error sending confirmation email:', error);
              
              resolve({
                id: this.lastID,
                userId,
                eventId,
                status: 'registered'
              });
            }
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  },
  
  // Cancel participation
  cancelParticipation: (eventId, userId) => {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE participants SET status = 'canceled' 
                  WHERE userId = ? AND eventId = ? AND status = 'registered'`;
                  
      db.run(sql, [userId, eventId], function(err) {
        if (err) return reject(err);
        
        if (this.changes === 0) {
          return reject(new Error('Participation non trouvée ou déjà annulée'));
        }
        
        resolve(true);
      });
    });
  },
  
  // Notify all participants about a new event
  notifyAllUsers: async (eventId) => {
    try {
      const event = await eventService.getEventById(eventId);
      
      // Get all verified users
      const sql = `SELECT * FROM users WHERE isVerified = 1`;
      
      return new Promise((resolve, reject) => {
        db.all(sql, [], async (err, users) => {
          if (err) return reject(err);
          
          const emailPromises = users.map(user => 
            emailService.sendEventReminder(user, event)
          );
          
          try {
            await Promise.all(emailPromises);
            resolve(true);
          } catch (error) {
            console.error('Error sending event notifications:', error);
            resolve(false);
          }
        });
      });
    } catch (error) {
      console.error('Error in notifyAllUsers:', error);
      return false;
    }
  }
};

module.exports = eventService; 