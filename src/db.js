const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, 'hiking.db');
let db = new sqlite3.Database(dbPath);

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
  
  // Create new connection
  db = new sqlite3.Database(dbPath);
  console.log('Database connection reestablished');
  
  return db;
}

initDb();

module.exports = db;
module.exports.reconnect = reconnect; 