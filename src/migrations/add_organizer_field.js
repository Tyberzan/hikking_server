const db = require('../db');

/**
 * Ajoute un champ organizer (boolean) à la table users pour indiquer si un utilisateur 
 * peut organiser des événements
 */
async function addOrganizerField() {
  return new Promise((resolve, reject) => {
    console.log('Migration: Vérification de l\'existence du champ organizer dans la table users...');
    
    // Vérifier si la colonne existe déjà
    db.get("PRAGMA table_info(users)", [], (err, rows) => {
      if (err) {
        console.error('Erreur lors de la vérification du schema:', err);
        return reject(err);
      }
      
      // Vérifier si la colonne organizer existe déjà
      //const columnExists = rows.some(row => row.name === 'organizer');
      
      //if (columnExists) {
      //  console.log('La colonne organizer existe déjà dans la table users.');
      //  return resolve(true);
      //}
      
      console.log('Ajout de la colonne organizer à la table users...');
      
      // Ajouter la colonne organizer à la table users
      db.run(`ALTER TABLE users ADD COLUMN organizer BOOLEAN DEFAULT 0 NOT NULL`, function(err) {
        if (err) {
          console.error('Erreur lors de l\'ajout de la colonne organizer:', err);
          return reject(err);
        }
        
        console.log('Colonne organizer ajoutée avec succès à la table users.');
        resolve(true);
      });
    });
  });
}

module.exports = addOrganizerField; 