const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuration améliorée pour Gmail
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT === '465',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    // Ne pas rejeter les connexions non autorisées
    rejectUnauthorized: false,
    // Force la version TLS minimale pour Gmail
    minVersion: 'TLSv1.2'
  },
  debug: true // Activer le débogage pour voir les erreurs détaillées dans la console
});

// Vérifier la connexion à la création
transporter.verify(function(error, success) {
  if (error) {
    console.error('Erreur de connexion SMTP:', error);
  } else {
    console.log('Serveur prêt à envoyer des emails');
  }
});

const emailService = {
  // Send verification code
  sendVerificationCode: async (email, firstName, code) => {
    try {
      const mailOptions = {
        from: `"Application Randonnée" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Vérifiez votre compte - Application de Randonnée',
        html: `
          <h2>Bonjour ${firstName},</h2>
          <p>Merci de vous être inscrit sur notre application de randonnée!</p>
          <p>Votre code de vérification est: <strong>${code}</strong></p>
          <p>Veuillez entrer ce code dans l'application pour valider votre compte.</p>
          <p>Cordialement,<br>L'équipe Rando</p>
        `
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log('Email envoyé: %s', info.messageId);
      return true;
    } catch (error) {
      console.error('Email error:', error);
      return false;
    }
  },

  // Send event reminder
  sendEventReminder: async (user, event) => {
    try {
      // Format the date for display
      const eventDate = new Date(event.date);
      const formattedDate = eventDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const mailOptions = {
        from: `"Application Randonnée" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: `Rappel: Randonnée "${event.name}" - ${formattedDate}`,
        html: `
          <h2>Bonjour ${user.firstName},</h2>
          <p>Nous vous rappelons que vous êtes inscrit à la randonnée suivante:</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3>${event.name}</h3>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Lieu:</strong> ${event.location}</p>
            <p><strong>Point de départ:</strong> ${event.startPoint}</p>
            ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
          </div>
          <p>Nous vous attendons avec impatience!</p>
          <p>Cordialement,<br>L'équipe Rando</p>
        `
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log('Email envoyé: %s', info.messageId);
      return true;
    } catch (error) {
      console.error('Email error:', error);
      return false;
    }
  }
};

module.exports = emailService; 