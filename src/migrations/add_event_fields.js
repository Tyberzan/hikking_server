const db = require('../db');

/**
 * Migration pour ajouter de nouveaux champs à la table events
 * - effortIPB: Integer pour l'effort IPB
 * - technicite: Integer pour la technicité
 * - risques: Integer pour les risques
 * - altitudeMin: Integer pour l'altitude minimum
 * - altitudeMax: Integer pour l'altitude maximum
 * - denivele: Integer pour le dénivelé
 * - visiorando: Integer pour Visiorando
 */

function migrate() {
  return new Promise((resolve, reject) => {
    console.log('Démarrage de la migration pour ajouter de nouveaux champs à la table events...');
    
    db.serialize(() => {
      // Vérifier si les colonnes existent déjà
      db.get("PRAGMA table_info(events)", (err, row) => {
        if (err) {
          return reject(err);
        }
        
        // Ajouter les nouvelles colonnes
        const alterStatements = [
          "ALTER TABLE events ADD COLUMN effortIPB INTEGER",
          "ALTER TABLE events ADD COLUMN technicite INTEGER",
          "ALTER TABLE events ADD COLUMN risques INTEGER",
          "ALTER TABLE events ADD COLUMN altitudeMin INTEGER",
          "ALTER TABLE events ADD COLUMN altitudeMax INTEGER",
          "ALTER TABLE events ADD COLUMN denivele INTEGER",
          "ALTER TABLE events ADD COLUMN visiorando INTEGER",
          "ALTER TABLE events ADD COLUMN distance REAL"
        ];
        
        // Exécuter chaque instruction ALTER TABLE
        let completed = 0;
        
        alterStatements.forEach(statement => {
          db.run(statement, (err) => {
            if (err) {
              // Si l'erreur indique que la colonne existe déjà, on continue
              if (err.message.includes('duplicate column name')) {
                console.log(`La colonne existe déjà: ${statement}`);
              } else {
                console.error(`Erreur lors de l'exécution de: ${statement}`, err);
                return reject(err);
              }
            } else {
              console.log(`Exécuté avec succès: ${statement}`);
            }
            
            completed++;
            if (completed === alterStatements.length) {
              console.log('Migration terminée avec succès');
              resolve();
            }
          });
        });
      });
    });
  });
}

// Exporter la fonction de migration
module.exports = { migrate }; 