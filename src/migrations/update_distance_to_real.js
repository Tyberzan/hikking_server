const db = require('../db');

/**
 * Migration pour modifier le type de la colonne distance de INTEGER à REAL (double)
 * dans la table events.
 */

function migrate() {
  return new Promise((resolve, reject) => {
    console.log('Démarrage de la migration pour modifier le type de la colonne distance...');
    
    db.serialize(() => {
      // Désactiver temporairement les contraintes de clé étrangère
      db.run("PRAGMA foreign_keys = OFF", function(err) {
        if (err) {
          console.error('Erreur lors de la désactivation des contraintes de clé étrangère:', err);
          return reject(err);
        }
        
        // Étape 1: Récupérer toutes les données actuelles
        db.all("SELECT * FROM events", [], (err, rows) => {
          if (err) {
            console.error('Erreur lors de la récupération des données:', err);
            return reject(err);
          }
          
          // Méthode alternative: utiliser ALTER TABLE directement
          db.run("ALTER TABLE events RENAME TO events_old", function(err) {
            if (err) {
              console.error('Erreur lors du renommage de la table events:', err);
              return reject(err);
            }
            
            // Étape 2: Créer une table avec le bon schéma
            db.run(`CREATE TABLE events (
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
              effortIPB INTEGER,
              technicite INTEGER,
              risques INTEGER,
              altitudeMin INTEGER,
              altitudeMax INTEGER,
              denivele INTEGER,
              visiorando INTEGER,
              distance REAL,
              FOREIGN KEY (createdBy) REFERENCES users(id)
            )`, function(err) {
              if (err) {
                console.error('Erreur lors de la création de la nouvelle table events:', err);
                return reject(err);
              }
              
              // Étape 3: Copier les données dans la nouvelle table
              const insertStmt = db.prepare(`INSERT INTO events (
                id, name, description, location, startPoint, date, duration, difficulty, 
                createdBy, createdAt, effortIPB, technicite, risques, altitudeMin, 
                altitudeMax, denivele, visiorando, distance
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
              
              rows.forEach(row => {
                // Convertir explicitement la distance en nombre à virgule flottante
                const distance = row.distance !== null ? parseFloat(row.distance) : null;
                
                insertStmt.run(
                  row.id, row.name, row.description, row.location, row.startPoint, 
                  row.date, row.duration, row.difficulty, row.createdBy, row.createdAt,
                  row.effortIPB, row.technicite, row.risques, row.altitudeMin,
                  row.altitudeMax, row.denivele, row.visiorando, distance
                );
              });
              
              insertStmt.finalize();
              
              // Étape 4: Copier les contraintes de clé étrangère
              // Note: Les contraintes sont déjà définies dans le CREATE TABLE ci-dessus
              
              // Étape 5: Supprimer l'ancienne table
              db.run("DROP TABLE events_old", function(err) {
                if (err) {
                  console.error('Erreur lors de la suppression de l\'ancienne table:', err);
                  return reject(err);
                }
                
                // Réactiver les contraintes de clé étrangère
                db.run("PRAGMA foreign_keys = ON", function(err) {
                  if (err) {
                    console.error('Erreur lors de la réactivation des contraintes de clé étrangère:', err);
                    return reject(err);
                  }
                  
                  console.log('Migration terminée avec succès: la colonne distance est maintenant de type REAL');
                  resolve();
                });
              });
            });
          });
        });
      });
    });
  });
}

// Exporter la fonction de migration
module.exports = { migrate }; 