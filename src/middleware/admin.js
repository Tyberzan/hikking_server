const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config();

// Middleware pour vérifier si un utilisateur est un administrateur
const adminAuth = (req, res, next) => {
  // Vérifier d'abord si l'utilisateur est authentifié
  const token = req.header('x-auth-token');

  if (!token) {
    return res.status(401).json({ message: 'Accès refusé, token manquant' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Vérifier dans la base de données si l'utilisateur est un administrateur
    db.get('SELECT admin FROM users WHERE id = ?', [decoded.user.id], (err, user) => {
      if (err) {
        console.error('Error checking admin status:', err);
        return res.status(500).json({ message: 'Erreur serveur' });
      }

      if (!user || user.admin !== 1) {
        return res.status(403).json({ message: 'Accès refusé. Privilèges administrateur requis.' });
      }

      // Utilisateur authentifié et administrateur
      req.user = decoded.user;
      next();
    });
  } catch (err) {
    res.status(401).json({ message: 'Token invalide' });
  }
};

// Middleware pour vérifier si un utilisateur est un super administrateur
const superAdminAuth = (req, res, next) => {
  // Vérifier d'abord si l'utilisateur est authentifié
  const token = req.header('x-auth-token');

  if (!token) {
    return res.status(401).json({ message: 'Accès refusé, token manquant' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Vérifier dans la base de données si l'utilisateur est un super administrateur
    db.get('SELECT superAdmin FROM users WHERE id = ?', [decoded.user.id], (err, user) => {
      if (err) {
        console.error('Error checking super admin status:', err);
        return res.status(500).json({ message: 'Erreur serveur' });
      }

      if (!user || user.superAdmin !== 1) {
        return res.status(403).json({ message: 'Accès refusé. Privilèges super administrateur requis.' });
      }

      // Utilisateur authentifié et super administrateur
      req.user = decoded.user;
      next();
    });
  } catch (err) {
    res.status(401).json({ message: 'Token invalide' });
  }
};

module.exports = { adminAuth, superAdminAuth }; 