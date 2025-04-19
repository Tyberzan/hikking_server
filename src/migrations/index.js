const { migrate: addEventFields } = require('./add_event_fields');
const { migrate: addUserAdminFields } = require('./add_user_admin_fields');
const { migrate: updateDistanceToReal } = require('./update_distance_to_real');
const addOrganizerField = require('./add_organizer_field');

async function runMigrations() {
  try {
    console.log('Exécution des migrations...');
    await addEventFields();
    await addUserAdminFields();
    await updateDistanceToReal();
    await addOrganizerField();
    console.log('Toutes les migrations ont été exécutées avec succès.');
  } catch (error) {
    console.error('Erreur lors de l\'exécution des migrations:', error);
    process.exit(1);
  }
}

// Si ce fichier est exécuté directement
if (require.main === module) {
  runMigrations().then(() => {
    process.exit(0);
  });
}

module.exports = { runMigrations }; 