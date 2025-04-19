const express = require('express');
const router = express.Router();
const db = require('../db');
const fs = require('fs');
const path = require('path');
const eventService = require('../services/eventService');

// Stocker les erreurs SQLite récentes
const recentErrors = [];

// Fonction pour enregistrer les erreurs
function logDbError(error, query = null) {
  const errorInfo = {
    date: new Date().toISOString(),
    message: error.message,
    code: error.code,
    query: query
  };
  
  recentErrors.push(errorInfo);
  
  // Limiter le nombre d'erreurs stockées à 20
  if (recentErrors.length > 20) {
    recentErrors.shift();
  }
  
  console.error('SQLite Error:', errorInfo);
}

// @route   GET /api/admin/db/users
// @desc    Get all users from database
// @access  Public (for testing purposes only, should be secured in production)
router.get('/db/users', (req, res) => {
  db.all(`SELECT id, email, password, firstName, lastName, profilePicture, verificationCode, isVerified, admin, superAdmin, createdAt FROM users`, [], (err, rows) => {
    if (err) {
      logDbError(err, 'SELECT users');
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
      logDbError(err, 'SELECT events');
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
      logDbError(err, 'SELECT participants');
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// @route   POST /api/admin/db/query
// @desc    Execute a custom SQL query
// @access  Public (for testing purposes only, should be secured in production)
router.post('/db/query', (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'La requête SQL est requise' });
  }
  
  // Par sécurité, limiter les types de requêtes possibles
  const firstWord = query.trim().split(' ')[0].toUpperCase();
  
  if (!['SELECT', 'PRAGMA', 'EXPLAIN'].includes(firstWord)) {
    return res.status(403).json({ error: 'Seules les requêtes SELECT, PRAGMA et EXPLAIN sont autorisées' });
  }
  
  db.all(query, [], (err, rows) => {
    if (err) {
      logDbError(err, query);
      return res.status(500).json({ error: `Erreur SQLite: ${err.message}` });
    }
    
    res.json(rows);
  });
});

// @route   GET /api/admin/db/test-connection
// @desc    Test the database connection
// @access  Public (for testing purposes only, should be secured in production)
router.get('/db/test-connection', (req, res) => {
  try {
    db.get('SELECT 1', [], (err, result) => {
      if (err) {
        logDbError(err, 'Test connection');
        return res.status(500).json({ 
          success: false, 
          message: `Erreur de connexion: ${err.message}` 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Connexion à la base de données réussie',
        result
      });
    });
  } catch (error) {
    logDbError(error, 'Test connection exception');
    res.status(500).json({ 
      success: false, 
      message: `Exception: ${error.message}` 
    });
  }
});

// @route   GET /api/admin/db/integrity
// @desc    Check the database integrity
// @access  Public (for testing purposes only, should be secured in production)
router.get('/db/integrity', (req, res) => {
  try {
    // Utiliser PRAGMA integrity_check pour vérifier l'intégrité de la base de données
    db.get('PRAGMA integrity_check', [], (err, result) => {
      if (err) {
        logDbError(err, 'Integrity check');
        return res.status(500).json({ 
          success: false, 
          message: `Erreur lors de la vérification d'intégrité: ${err.message}` 
        });
      }
      
      // Vérifier le schema des tables
      db.all(`SELECT type, name, sql FROM sqlite_master WHERE type='table'`, [], (err, tables) => {
        if (err) {
          logDbError(err, 'Schema check');
          return res.status(500).json({ 
            success: false, 
            message: `Erreur lors de la vérification du schéma: ${err.message}` 
          });
        }
        
        // Formater les résultats
        const details = tables.map(table => `Table ${table.name}:\n${table.sql}`).join('\n\n');
        
        res.json({ 
          success: result.integrity_check === 'ok', 
          message: `Vérification d'intégrité: ${result.integrity_check}`,
          details: `Schéma de la base de données:\n\n${details}`
        });
      });
    });
  } catch (error) {
    logDbError(error, 'Integrity check exception');
    res.status(500).json({ 
      success: false, 
      message: `Exception: ${error.message}` 
    });
  }
});

// @route   GET /api/admin/db/errors
// @desc    Get recent database errors
// @access  Public (for testing purposes only, should be secured in production)
router.get('/db/errors', (req, res) => {
  res.json({ errors: recentErrors });
});

// @route   GET /api/admin/db/force-error
// @desc    Force a database error for testing
// @access  Public (for testing purposes only, should be secured in production)
router.get('/db/force-error', (req, res) => {
  try {
    // Exécuter une requête qui va échouer
    db.run('INSERT INTO table_that_does_not_exist (col) VALUES (?)', ['test'], (err) => {
      if (err) {
        logDbError(err, 'FORCED ERROR: INSERT INTO table_that_does_not_exist');
        return res.json({ 
          success: true, 
          message: 'Erreur forcée avec succès', 
          error: err.message 
        });
      }
      
      // Si par malheur ça ne plante pas
      res.status(500).json({ 
        success: false, 
        message: 'L\'erreur n\'a pas pu être forcée' 
      });
    });
  } catch (error) {
    logDbError(error, 'Force error exception');
    res.json({ 
      success: true, 
      message: 'Exception forcée avec succès', 
      error: error.message 
    });
  }
});

// @route   GET /api/admin/db/backup
// @desc    Create a database backup
// @access  Public (for testing purposes only, should be secured in production)
router.get('/db/backup', (req, res) => {
  try {
    // Ensure backup directory exists
    const backupDir = path.join(__dirname, '../../data/backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `hiking_backup_${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFilename);
    const dbPath = path.join(__dirname, '../../data/hiking.db');
    
    // Check if source database exists
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({
        success: false,
        message: 'Base de données source introuvable'
      });
    }
    
    // Create stream to copy database file
    const readStream = fs.createReadStream(dbPath);
    const writeStream = fs.createWriteStream(backupPath);
    
    readStream.on('error', (err) => {
      logDbError(err, 'Database backup - read stream error');
      return res.status(500).json({
        success: false,
        message: `Erreur lors de la lecture de la base de données: ${err.message}`
      });
    });
    
    writeStream.on('error', (err) => {
      logDbError(err, 'Database backup - write stream error');
      return res.status(500).json({
        success: false,
        message: `Erreur lors de l'écriture de la sauvegarde: ${err.message}`
      });
    });
    
    writeStream.on('finish', () => {
      // Get list of existing backups
      fs.readdir(backupDir, (err, files) => {
        if (err) {
          return res.json({
            success: true,
            message: `Sauvegarde créée avec succès: ${backupFilename}`,
            backupPath: backupPath,
            backups: []
          });
        }
        
        const backups = files
          .filter(file => file.startsWith('hiking_backup_') && file.endsWith('.db'))
          .map(file => ({
            filename: file,
            path: path.join(backupDir, file),
            size: fs.statSync(path.join(backupDir, file)).size,
            created: new Date(file.replace('hiking_backup_', '').replace('.db', '').replace(/-/g, ':')).toISOString()
          }))
          .sort((a, b) => new Date(b.created) - new Date(a.created));
        
        res.json({
          success: true,
          message: `Sauvegarde créée avec succès: ${backupFilename}`,
          backupPath: backupPath,
          backups: backups
        });
      });
    });
    
    // Perform the backup
    readStream.pipe(writeStream);
    
  } catch (error) {
    logDbError(error, 'Database backup exception');
    res.status(500).json({ 
      success: false, 
      message: `Exception lors de la sauvegarde: ${error.message}` 
    });
  }
});

// @route   GET /api/admin/db/backups
// @desc    Get a list of all database backups
// @access  Public (for testing purposes only, should be secured in production)
router.get('/db/backups', (req, res) => {
  try {
    const backupDir = path.join(__dirname, '../../data/backups');
    
    // Check if backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      return res.json({ backups: [] });
    }
    
    // Get list of backup files
    fs.readdir(backupDir, (err, files) => {
      if (err) {
        logDbError(err, 'List backups error');
        return res.status(500).json({
          success: false,
          message: `Erreur lors de la lecture du répertoire de sauvegardes: ${err.message}`
        });
      }
      
      const backups = files
        .filter(file => file.startsWith('hiking_backup_') && file.endsWith('.db'))
        .map(file => {
          try {
            const filePath = path.join(backupDir, file);
            const stats = fs.statSync(filePath);
            return {
              filename: file,
              path: filePath,
              size: stats.size,
              created: new Date(file.replace('hiking_backup_', '').replace('.db', '').replace(/-/g, ':')).toISOString()
            };
          } catch (err) {
            console.error(`Error processing backup file ${file}:`, err);
            return null;
          }
        })
        .filter(backup => backup !== null)
        .sort((a, b) => new Date(b.created) - new Date(a.created));
      
      res.json({ backups: backups });
    });
  } catch (error) {
    logDbError(error, 'List backups exception');
    res.status(500).json({ 
      success: false, 
      message: `Exception lors de la récupération des sauvegardes: ${error.message}` 
    });
  }
});

// @route   GET /api/admin/db/restore/:filename
// @desc    Restore database from a backup
// @access  Public (for testing purposes only, should be secured in production)
router.get('/db/restore/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const backupDir = path.join(__dirname, '../../data/backups');
    const backupPath = path.join(backupDir, filename);
    const dbPath = path.join(__dirname, '../../data/hiking.db');
    
    // Check if backup file exists
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        success: false,
        message: `Fichier de sauvegarde introuvable: ${filename}`
      });
    }
    
    // Close current database connection to allow overwriting
    db.close((err) => {
      if (err) {
        logDbError(err, 'Database close error during restore');
        return res.status(500).json({
          success: false,
          message: `Erreur lors de la fermeture de la base de données: ${err.message}`
        });
      }
      
      // Create a backup of the current database before restoring
      const timestampBeforeRestore = new Date().toISOString().replace(/[:.]/g, '-');
      const preRestoreBackup = `hiking_pre_restore_${timestampBeforeRestore}.db`;
      const preRestoreBackupPath = path.join(backupDir, preRestoreBackup);
      
      try {
        fs.copyFileSync(dbPath, preRestoreBackupPath);
      } catch (copyErr) {
        console.error('Error creating pre-restore backup:', copyErr);
        // Continue even if pre-restore backup fails
      }
      
      // Copy backup file to main database
      fs.copyFile(backupPath, dbPath, (copyErr) => {
        if (copyErr) {
          logDbError(copyErr, 'Restore copy error');
          return res.status(500).json({
            success: false,
            message: `Erreur lors de la restauration: ${copyErr.message}`
          });
        }
        
        // Reopen database connection using the reconnect function from db module
        const reconnectedDb = require('../db').reconnect();
        
        res.json({
          success: true,
          message: `Base de données restaurée avec succès depuis: ${filename}`,
          preRestoreBackup: preRestoreBackup
        });
      });
    });
  } catch (error) {
    logDbError(error, 'Restore exception');
    res.status(500).json({ 
      success: false, 
      message: `Exception lors de la restauration: ${error.message}` 
    });
  }
});

// Notify all users about a specific event
router.post('/api/admin/notify-event/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    const result = await eventService.notifyAllUsers(eventId);
    
    if (result) {
      res.status(200).json({ 
        success: true, 
        message: 'Notifications sent to all verified users' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Error sending notifications' 
      });
    }
  } catch (error) {
    console.error('Error in notify-event endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error sending notifications', 
      error: error.message 
    });
  }
});

// @route   POST /api/admin/user/privileges
// @desc    Update user privileges (admin, superAdmin)
// @access  Public (for testing purposes only, should be secured in production)
router.post('/user/privileges', async (req, res) => {
  try {
    const { email, role } = req.body;
    
    if (!email || !role) {
      return res.status(400).json({ success: false, message: 'Email et rôle sont requis' });
    }
    
    // Vérifier que l'utilisateur existe
    const checkUserSql = 'SELECT id FROM users WHERE email = ?';
    
    db.get(checkUserSql, [email], (err, user) => {
      if (err) {
        logDbError(err, 'Check user by email');
        return res.status(500).json({ success: false, message: 'Erreur de base de données' });
      }
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
      }
      
      // Définir les valeurs d'admin et superAdmin selon le rôle
      let admin = 0;
      let superAdmin = 0;
      
      if (role === 'admin') {
        admin = 1;
      } else if (role === 'superadmin') {
        admin = 1;
        superAdmin = 1;
      }
      
      // Mettre à jour les privilèges
      const updateSql = 'UPDATE users SET admin = ?, superAdmin = ? WHERE email = ?';
      
      db.run(updateSql, [admin, superAdmin, email], function(err) {
        if (err) {
          logDbError(err, 'Update user privileges');
          return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des privilèges' });
        }
        
        if (this.changes === 0) {
          return res.status(400).json({ success: false, message: 'Aucune modification effectuée' });
        }
        
        res.json({ 
          success: true, 
          message: 'Privilèges mis à jour avec succès',
          role: role
        });
      });
    });
  } catch (error) {
    console.error('Error updating privileges:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   POST /api/admin/user/organizer
// @desc    Update user organizer status
// @access  Public (for testing purposes only, should be secured in production)
router.post('/user/organizer', async (req, res) => {
  try {
    const { email, isOrganizer } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email est requis' });
    }
    
    if (typeof isOrganizer !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isOrganizer doit être un booléen' });
    }
    
    // Vérifier que l'utilisateur existe
    const checkUserSql = 'SELECT id FROM users WHERE email = ?';
    
    db.get(checkUserSql, [email], async (err, user) => {
      if (err) {
        logDbError(err, 'Check user by email');
        return res.status(500).json({ success: false, message: 'Erreur de base de données' });
      }
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
      }
      
      try {
        // Mettre à jour le statut d'organisateur
        const userService = require('../services/userService');
        const result = await userService.updateOrganizerStatus(email, isOrganizer);
        
        res.json({ 
          success: true, 
          message: result.message,
          isOrganizer: isOrganizer
        });
      } catch (error) {
        console.error('Error updating organizer status:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du statut d\'organisateur' });
      }
    });
  } catch (error) {
    console.error('Error in organizer status update:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router; 