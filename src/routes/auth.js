const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const userService = require('../services/userService');
const emailService = require('../services/emailService');
const router = express.Router();

// @route   POST /api/auth/test-email
// @desc    Test email configuration 
// @access  Public
router.post('/test-email', [
  body('email', 'Veuillez entrer un email valide').isEmail()
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const testCode = 'TEST123';
    const result = await emailService.sendVerificationCode(
      req.body.email, 
      'Utilisateur', 
      testCode
    );
    
    if (result) {
      res.json({ 
        success: true, 
        message: 'Email de test envoyé avec succès',
        codeForTest: testCode  // Inclure le code pour faciliter les tests
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Échec de l\'envoi de l\'email de test. Vérifiez les logs du serveur pour plus de détails.' 
      });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de l\'envoi de l\'email de test',
      error: error.message 
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post(
  '/register',
  [
    body('email', 'Veuillez entrer un email valide').isEmail(),
    body('password', 'Le mot de passe doit contenir au moins 6 caractères').isLength({ min: 6 }),
    body('firstName', 'Le prénom est requis').notEmpty(),
    body('lastName', 'Le nom est requis').notEmpty()
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if user already exists
      const existingUser = await userService.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }

      // Register user
      const newUser = await userService.registerUser(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Inscription réussie! Veuillez vérifier votre email',
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName
        }
      });
    } catch (error) {
      console.error('Error in register route:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
);

// @route   POST /api/auth/verify
// @desc    Verify email with code
// @access  Public
router.post(
  '/verify',
  [
    body('email', 'Email invalide').isEmail(),
    body('code', 'Code requis').notEmpty()
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      await userService.verifyEmail(req.body.email, req.body.code);
      res.json({ success: true, message: 'Email vérifié avec succès' });
    } catch (error) {
      console.error('Error in verify route:', error);
      res.status(400).json({ message: error.message || 'Vérification échouée' });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  [
    body('email', 'Veuillez entrer un email valide').isEmail(),
    body('password', 'Mot de passe requis').exists()
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if user exists
      const user = await userService.getUserByEmail(req.body.email);
      if (!user) {
        return res.status(400).json({ message: 'Identifiants invalides' });
      }

      // Check if email is verified
      if (!user.isVerified) {
        return res.status(400).json({ 
          message: 'Veuillez vérifier votre email avant de vous connecter',
          needsVerification: true
        });
      }

      // Check password
      const isMatch = await bcrypt.compare(req.body.password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Identifiants invalides' });
      }

      // Create and return JWT token
      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '7d' },
        (err, token) => {
          if (err) throw err;
          res.json({
            token,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              profilePicture: user.profilePicture
            }
          });
        }
      );
    } catch (error) {
      console.error('Error in login route:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
);

module.exports = router; 