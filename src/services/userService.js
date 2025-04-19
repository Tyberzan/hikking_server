const db = require('../db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const emailService = require('./emailService');

const userService = {
  // Register a new user
  registerUser: (userData) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);
        
        // Generate verification code
        const verificationCode = crypto.randomBytes(3).toString('hex');
        
        // Insert user into database
        const sql = `INSERT INTO users (email, password, firstName, lastName, verificationCode) 
                    VALUES (?, ?, ?, ?, ?)`;
                    
        db.run(sql, [
          userData.email,
          hashedPassword,
          userData.firstName,
          userData.lastName,
          verificationCode
        ], function (err) {
          if (err) {
            console.error(err);
            return reject(err);
          }
          
          // Send verification email
          emailService.sendVerificationCode(userData.email, userData.firstName, verificationCode);
          
          resolve({
            id: this.lastID,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  },
  
  // Verify user's email
  verifyEmail: (email, code) => {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE users SET isVerified = 1, verificationCode = NULL 
                  WHERE email = ? AND verificationCode = ?`;
                  
      db.run(sql, [email, code], function(err) {
        if (err) return reject(err);
        
        if (this.changes === 0) {
          return reject(new Error('Code de vérification invalide'));
        }
        
        resolve(true);
      });
    });
  },
  
  // Get user by email
  getUserByEmail: (email) => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT id, email, password, firstName, lastName, profilePicture, 
                  isVerified, admin, superAdmin, organizer FROM users WHERE email = ?`;
                  
      db.get(sql, [email], (err, user) => {
        if (err) return reject(err);
        if (!user) return resolve(null);
        
        resolve(user);
      });
    });
  },
  
  // Get user by ID
  getUserById: (id) => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT id, email, firstName, lastName, profilePicture, 
                  isVerified, createdAt, admin, superAdmin, organizer FROM users WHERE id = ?`;
                  
      db.get(sql, [id], (err, user) => {
        if (err) return reject(err);
        if (!user) return resolve(null);
        
        resolve(user);
      });
    });
  },
  
  // Update profile picture
  updateProfilePicture: (userId, filename) => {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE users SET profilePicture = ? WHERE id = ?`;
      
      db.run(sql, [filename, userId], function(err) {
        if (err) return reject(err);
        
        if (this.changes === 0) {
          return reject(new Error('Utilisateur non trouvé'));
        }
        
        resolve(true);
      });
    });
  },
  
  // Get user's events (past and future)
  getUserEvents: (userId) => {
    return new Promise((resolve, reject) => {
      const currentDate = new Date().toISOString();
      
      const pastSql = `
        SELECT e.*, p.status
        FROM events e
        JOIN participants p ON e.id = p.eventId
        WHERE p.userId = ? AND e.date < ?
        ORDER BY e.date DESC
      `;
      
      const futureSql = `
        SELECT e.*, p.status
        FROM events e
        JOIN participants p ON e.id = p.eventId
        WHERE p.userId = ? AND e.date >= ?
        ORDER BY e.date ASC
      `;
      
      db.all(pastSql, [userId, currentDate], (err, pastEvents) => {
        if (err) return reject(err);
        
        db.all(futureSql, [userId, currentDate], (err, futureEvents) => {
          if (err) return reject(err);
          
          resolve({
            past: pastEvents || [],
            future: futureEvents || []
          });
        });
      });
    });
  },
  
  // Update user organizer status
  updateOrganizerStatus: (email, isOrganizer) => {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE users SET organizer = ? WHERE email = ?`;
      
      db.run(sql, [isOrganizer ? 1 : 0, email], function(err) {
        if (err) {
          console.error('Erreur lors de la mise à jour du statut d\'organisateur:', err);
          return reject(err);
        }
        
        if (this.changes === 0) {
          return reject(new Error('Utilisateur non trouvé'));
        }
        
        resolve({
          success: true,
          message: `Statut d'organisateur ${isOrganizer ? 'activé' : 'désactivé'} pour ${email}`,
          changes: this.changes
        });
      });
    });
  }
};

module.exports = userService; 