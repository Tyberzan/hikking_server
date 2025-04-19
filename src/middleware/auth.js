const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware to check if user is authenticated
const auth = (req, res, next) => {
  console.log('Middleware auth: vérification du token');
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    console.log('Middleware auth: Aucun token fourni');
    return res.status(401).json({ message: 'Accès refusé, token manquant' });
  }

  // Verify token
  try {
    console.log('Middleware auth: Vérification du token JWT');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    console.log('Middleware auth: Token valide, utilisateur:', req.user);
    next();
  } catch (err) {
    console.error('Middleware auth: Token invalide -', err.message);
    res.status(401).json({ message: 'Token invalide' });
  }
};

module.exports = auth; 