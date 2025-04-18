const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, 'hiking.db');

// Options de configuration pour optimiser les performances et la stabilité
const dbOptions = {
  timeout: 30000,        // Délai d'attente de 30 secondes pour les transactions verrouillées
  busyTimeout: 30000,    // Délai d'attente lorsque la base de données est occupée
};

// Créer la connexion avec les options améliorées
let db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('Erreur lors de la connexion à la base de données:', err.message);
  } else {
    console.log('Connexion établie avec la base de données SQLite');
    
    // Configurer les paramètres de performance et de stabilité
    db.configure('busyTimeout', dbOptions.busyTimeout);
    
    // Activer les clés étrangères
    db.run('PRAGMA foreign_keys = ON');
    
    // Optimisations pour améliorer les performances
    db.run('PRAGMA synchronous = NORMAL'); // Réduire synchronisation disque (compromis performance/sécurité)
    db.run('PRAGMA journal_mode = WAL');   // Write-Ahead Logging pour de meilleures performances
    db.run('PRAGMA cache_size = -64000');  // Augmenter la taille du cache (64MB)
  }
});

// Initialize database tables
function initDb() {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      profilePicture TEXT,
      verificationCode TEXT,
      isVerified BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Hiking events table
    db.run(`CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      location TEXT NOT NULL,
      startPoint TEXT NOT NULL,
      date DATETIME NOT NULL,
      duration INTEGER,
      difficulty TEXT,
      createdBy INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (createdBy) REFERENCES users(id)
    )`);

    // Participants junction table
    db.run(`CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      eventId INTEGER NOT NULL,
      status TEXT NOT NULL, /* 'registered', 'attended', 'canceled' */
      registeredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (eventId) REFERENCES events(id),
      UNIQUE(userId, eventId)
    )`);
  });
}

// Function to reconnect to the database
function reconnect() {
  // Close existing connection if open
  if (db) {
    try {
      db.close();
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }
  
  // Create new connection with the same optimized settings
  db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
      console.error('Erreur lors de la reconnexion à la base de données:', err.message);
    } else {
      console.log('Reconnexion établie avec la base de données SQLite');
      
      // Reconfigurer les paramètres de performance et de stabilité
      db.configure('busyTimeout', dbOptions.busyTimeout);
      db.run('PRAGMA foreign_keys = ON');
      db.run('PRAGMA synchronous = NORMAL');
      db.run('PRAGMA journal_mode = WAL');
      db.run('PRAGMA cache_size = -64000');
    }
  });
  
  console.log('Database connection reestablished');
  
  return db;
}

// Fonction pour exécuter une requête avec un délai d'attente spécifique
function runWithTimeout(query, params = [], timeout = dbOptions.timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Délai d'exécution de la requête dépassé (${timeout}ms): ${query}`));
    }, timeout);
    
    db.run(query, params, function(err) {
      clearTimeout(timer);
      if (err) return reject(err);
      resolve(this);
    });
  });
}

// Fonction pour exécuter une requête SELECT avec un délai d'attente spécifique
function getAllWithTimeout(query, params = [], timeout = dbOptions.timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Délai d'exécution de la requête dépassé (${timeout}ms): ${query}`));
    }, timeout);
    
    db.all(query, params, function(err, rows) {
      clearTimeout(timer);
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Fonction pour obtenir un seul résultat avec un délai d'attente spécifique
function getOneWithTimeout(query, params = [], timeout = dbOptions.timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Délai d'exécution de la requête dépassé (${timeout}ms): ${query}`));
    }, timeout);
    
    db.get(query, params, function(err, row) {
      clearTimeout(timer);
      if (err) return reject(err);
      resolve(row);
    });
  });
}

initDb();

module.exports = db;
module.exports.reconnect = reconnect;
module.exports.runWithTimeout = runWithTimeout;
module.exports.getAllWithTimeout = getAllWithTimeout;
module.exports.getOneWithTimeout = getOneWithTimeout; 