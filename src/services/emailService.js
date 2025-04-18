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
  },

  // Envoyer email de confirmation d'inscription à un événement
  sendEventRegistrationConfirmation: async (user, event) => {
    try {
      // S'assurer que les données utilisateur et événement sont valides
      if (!user || !user.email || !user.firstName) {
        console.error('Données utilisateur incomplètes pour l\'envoi d\'email:', user);
        return false;
      }
      
      if (!event || !event.name || !event.date || !event.location) {
        console.error('Données événement incomplètes pour l\'envoi d\'email:', event);
        return false;
      }
      
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
        subject: `Confirmation d'inscription: ${event.name}`,
        html: `
          <h2>Bonjour ${user.firstName},</h2>
          <p>Vous êtes maintenant inscrit à la randonnée suivante:</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3>${event.name}</h3>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Lieu:</strong> ${event.location}</p>
            <p><strong>Point de départ:</strong> ${event.startPoint || 'Non spécifié'}</p>
            <p><strong>Difficulté:</strong> ${event.difficulty || 'Non spécifiée'}</p>
            ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
          </div>
          <p>Merci pour votre inscription. Nous vous enverrons un rappel avant l'événement.</p>
          <p>Cordialement,<br>L'équipe Rando</p>
        `
      };
      
      console.log('Tentative d\'envoi d\'email à', user.email, 'pour l\'événement', event.name);
      
      const info = await transporter.sendMail(mailOptions);
      console.log('Email de confirmation d\'inscription envoyé: %s', info.messageId);
      return true;
    } catch (error) {
      console.error('Erreur d\'envoi d\'email de confirmation d\'inscription:', error);
      console.error('Détails de l\'erreur:', error.message);
      if (error.code) {
        console.error('Code d\'erreur:', error.code);
      }
      if (error.command) {
        console.error('Commande ayant échoué:', error.command);
      }
      return false;
    }
  },

  // Envoyer email de confirmation d'annulation d'inscription
  sendEventCancellationConfirmation: async (user, event) => {
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
        subject: `Annulation d'inscription: ${event.name}`,
        html: `
          <h2>Bonjour ${user.firstName},</h2>
          <p>Nous confirmons l'annulation de votre inscription à la randonnée suivante:</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3>${event.name}</h3>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Lieu:</strong> ${event.location}</p>
          </div>
          <p>Nous espérons vous revoir bientôt pour d'autres événements.</p>
          <p>Cordialement,<br>L'équipe Rando</p>
        `
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log('Email de confirmation d\'annulation envoyé: %s', info.messageId);
      return true;
    } catch (error) {
      console.error('Erreur d\'envoi d\'email d\'annulation:', error);
      return false;
    }
  }
};

module.exports = emailService; 