const db = require('../db');

/**
 * Migration pour ajouter des champs d'administration à la table users
 * - admin: Boolean pour indiquer si l'utilisateur est un administrateur
 * - superAdmin: Boolean pour indiquer si l'utilisateur est un super administrateur
 */

function migrate() {
  return new Promise((resolve, reject) => {
    console.log('Démarrage de la migration pour ajouter les champs admin et superAdmin à la table users...');
    
    db.serialize(() => {
      // Vérifier si les colonnes existent déjà
      db.get("PRAGMA table_info(users)", (err, row) => {
        if (err) {
          return reject(err);
        }
        
        // Ajouter les nouvelles colonnes
        const alterStatements = [
          "ALTER TABLE users ADD COLUMN admin BOOLEAN DEFAULT 0",
          "ALTER TABLE users ADD COLUMN superAdmin BOOLEAN DEFAULT 0"
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