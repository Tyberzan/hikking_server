const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const userService = require('../services/userService');
const db = require('../db');

// Configure multer for profile image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/profile');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user.id;
    const fileExt = path.extname(file.originalname);
    cb(null, `user_${userId}_${Date.now()}${fileExt}`);
  }
});

// Filter to only allow image files
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non supporté. Seuls JPEG, PNG et JPG sont autorisés.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await userService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Don't send sensitive information
    delete user.password;
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @route   POST /api/users/profile-picture
// @desc    Upload profile picture
// @access  Private
router.post('/profile-picture', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }
    
    // Get filename (without path)
    const filename = path.basename(req.file.path);
    
    // Update user's profile picture in database
    await userService.updateProfilePicture(req.user.id, filename);
    
    res.json({
      success: true,
      message: 'Photo de profil mise à jour avec succès',
      profilePicture: filename
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ message: 'Erreur lors du téléchargement de l\'image' });
  }
});

// @route   GET /api/users/events
// @desc    Get events for the authenticated user
// @access  Private
router.get('/events', auth, async (req, res) => {
  try {
    console.log('DEBUG: Récupération des événements pour userId:', req.user.id);
    
    // Récupérer les participations de l'utilisateur
    const sql = `SELECT p.*, e.name, e.location, e.startPoint, e.date, e.duration, e.difficulty, e.description
                FROM participants p
                JOIN events e ON p.eventId = e.id
                WHERE p.userId = ?`;
                
    db.all(sql, [req.user.id], (err, rows) => {
      if (err) {
        console.error('ERROR: Erreur SQL lors de la récupération des événements utilisateur:', err.message);
        return res.status(500).json({ message: 'Erreur serveur' });
      }
      
      console.log('DEBUG: Événements trouvés pour l\'utilisateur:', rows.length);
      console.log('DEBUG: Format de la réponse:', Array.isArray(rows) ? 'Array' : typeof rows);
      console.log('DEBUG: Premier événement (si existe):', rows.length > 0 ? rows[0] : 'Aucun');
      
      // Renvoyer les événements
      res.json(rows);
    });
  } catch (error) {
    console.error('ERROR: Exception dans la route /events:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Error handler for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Fichier trop volumineux. Maximum 5MB.' });
    }
    return res.status(400).json({ message: err.message });
  }
  
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  
  next();
});

module.exports = router; 