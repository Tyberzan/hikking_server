const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');
const adminRoutes = require('./routes/admin');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const profilePicsDir = path.join(uploadsDir, 'profile');
if (!fs.existsSync(profilePicsDir)) {
  fs.mkdirSync(profilePicsDir);
}

// Middleware pour le debug des requêtes
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers));
  next();
});

// Middleware
app.use(cors());

// Configuration CORS complète pour résoudre les problèmes d'accès depuis d'autres appareils
app.use((req, res, next) => {
  // Autoriser toutes les origines
  res.header('Access-Control-Allow-Origin', '*');
  
  // En-têtes autorisés
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-auth-token, Authorization');
  
  // Méthodes autorisées, en particulier pour les requêtes POST
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  // Permettre l'envoi de cookies via CORS
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Exposer l'en-tête contenant le token d'authentification
  res.header('Access-Control-Expose-Headers', 'x-auth-token');
  
  // Configuration de keep-alive à 30 minutes (1800 secondes)
  res.header('Connection', 'keep-alive');
  res.header('Keep-Alive', 'timeout=1800');
  res.header('Access-Control-Max-Age', '1800');
  
  // Préflight requests (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin', adminRoutes);

// Root route - redirect to index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Admin route
app.get('/admin', (req, res) => {
  // Servir la page admin-db.html
  // La vérification des droits d'accès à l'API sera gérée
  // par les middlewares adminAuth et superAdminAuth
  res.sendFile(path.join(__dirname, '../public/admin-db.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Une erreur est survenue',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Interface utilisateur disponible sur http://localhost:${PORT}`);
  console.log(`Interface accessible depuis d'autres appareils sur http://VOTRE_IP_LOCALE:${PORT}`);
  console.log(`Interface d'administration disponible sur http://localhost:${PORT}/admin`);
}); 