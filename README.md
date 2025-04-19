# Hiking Server API

Une API RESTful pour gérer des événements de randonnée, des profils utilisateurs et les participations aux événements.

## Dernières mises à jour

### Version 1.2.0 (23/05/2024)
- **Ajout du rôle Organisateur** : Un nouveau champ booléen "organizer" a été ajouté à la table des utilisateurs pour identifier les utilisateurs autorisés à créer des événements.
- **Interface de gestion des organisateurs** : Un toggle switch a été ajouté dans l'interface d'administration pour activer/désactiver facilement le statut d'organisateur.
- **Badge Organisateur** : Les utilisateurs ayant le statut d'organisateur voient un badge "Organisateur" affiché à côté de leur nom dans l'interface.

### Version 1.1.0 (22/05/2024)
- **Correction du formulaire de changement de mot de passe dans l'interface d'administration** : Résolution d'un problème où la requête POST n'était pas envoyée lors du clic sur le bouton Enregistrer.
- **Amélioration de l'authentification admin** : Les informations administrateur sont maintenant incluses dans le token JWT pour une meilleure sécurité.
- **Ajout de logs détaillés** : Des logs plus complets pour faciliter le débogage des problèmes d'authentification.
- **Optimisation des requêtes asynchrones** : Transformation des callbacks en promesses pour une meilleure gestion des erreurs.

## Installation et Configuration

### Prérequis
- Node.js (v14.x ou supérieur)
- npm (v6.x ou supérieur)

### Installation

1. Clonez le dépôt :
   ```
   git clone https://github.com/votre-utilisateur/hiking-server.git
   cd hiking-server
   ```

2. Installez les dépendances :
   ```
   npm install
   ```

3. Configurez les variables d'environnement en créant ou modifiant le fichier `.env` :
   ```
   PORT=3000
   JWT_SECRET=votre_clé_secrète_ici
   EMAIL_USER=votre_email@gmail.com
   EMAIL_PASS=votre_mot_de_passe_application
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   ```

4. Démarrez le serveur :
   ```
   npm run dev   # Mode développement avec rechargement auto
   ```
   ou 
   ```
   npm start     # Mode production
   ```

5. Accédez à l'application dans votre navigateur :
   - Interface utilisateur : `http://localhost:3000`
   - Interface d'administration : `http://localhost:3000/admin`

## Structure de la base de données

L'application utilise SQLite avec la structure suivante :

### Table `users`
| Champ | Type | Description |
|-------|------|-------------|
| id | INTEGER | Clé primaire auto-incrémentée |
| email | TEXT | Email unique de l'utilisateur |
| password | TEXT | Mot de passe hashé |
| firstName | TEXT | Prénom |
| lastName | TEXT | Nom de famille |
| profilePicture | TEXT | Chemin de l'image de profil |
| verificationCode | TEXT | Code pour la vérification de l'email |
| isVerified | BOOLEAN | Statut de vérification (0/1) |
| admin | BOOLEAN | Droits administrateur (0/1) |
| superAdmin | BOOLEAN | Droits super administrateur (0/1) |
| organizer | BOOLEAN | Droits d'organisateur (0/1) |
| createdAt | DATETIME | Date de création du compte |

### Table `events`
| Champ | Type | Description |
|-------|------|-------------|
| id | INTEGER | Clé primaire auto-incrémentée |
| name | TEXT | Nom de l'événement |
| description | TEXT | Description détaillée |
| location | TEXT | Lieu de l'événement |
| startPoint | TEXT | Point de départ précis |
| date | DATETIME | Date et heure de l'événement |
| duration | INTEGER | Durée en minutes |
| difficulty | TEXT | Niveau de difficulté |
| createdBy | INTEGER | ID de l'utilisateur créateur |
| createdAt | DATETIME | Date de création de l'événement |

### Table `participants`
| Champ | Type | Description |
|-------|------|-------------|
| id | INTEGER | Clé primaire auto-incrémentée |
| userId | INTEGER | ID de l'utilisateur participant |
| eventId | INTEGER | ID de l'événement |
| status | TEXT | Statut : 'registered', 'canceled', 'attended' |
| registeredAt | DATETIME | Date d'inscription |

## Endpoints API

### Authentification

- **POST /api/auth/register** : Inscription d'un nouvel utilisateur
  ```json
  {
    "email": "utilisateur@exemple.com",
    "password": "mot_de_passe",
    "firstName": "Prénom",
    "lastName": "Nom"
  }
  ```
  Réponse : `201 Created` avec informations utilisateur et token JWT

- **POST /api/auth/verify** : Vérification d'email avec code
  ```json
  {
    "email": "utilisateur@exemple.com",
    "code": "code_reçu_par_email"
  }
  ```
  Réponse : `200 OK` avec token JWT si la vérification réussit

- **POST /api/auth/login** : Connexion
  ```json
  {
    "email": "utilisateur@exemple.com",
    "password": "mot_de_passe"
  }
  ```
  Réponse : `200 OK` avec token JWT si la connexion réussit

### Utilisateurs

- **GET /api/users/me** : Récupérer le profil de l'utilisateur connecté (authentification requise)
  
  Réponse : `200 OK` avec les données du profil

- **POST /api/users/profile-picture** : Télécharger une image de profil (authentification requise)
  ```
  Formulaire multipart avec champ "profilePicture"
  ```
  Réponse : `200 OK` avec l'URL de l'image téléchargée

- **GET /api/users/events** : Récupérer les événements de l'utilisateur (authentification requise)
  
  Réponse : `200 OK` avec la liste des événements passés et futurs de l'utilisateur

### Événements

- **POST /api/events** : Créer un nouvel événement (authentification requise)
  ```json
  {
    "name": "Randonnée au Mont Blanc",
    "description": "Une randonnée magnifique...",
    "location": "Chamonix, France",
    "startPoint": "Gare de Chamonix",
    "date": "2023-07-15T09:00:00.000Z",
    "duration": 480,
    "difficulty": "moyenne",
    "notifyUsers": true
  }
  ```
  Réponse : `201 Created` avec les détails de l'événement créé

- **GET /api/events** : Récupérer tous les événements
  
  Paramètres optionnels :
  - `dateFrom` : Date de début pour filtrer (YYYY-MM-DD)
  - `dateTo` : Date de fin pour filtrer (YYYY-MM-DD)
  - `difficulty` : Niveau de difficulté ('facile', 'moyenne', 'difficile')
  
  Réponse : `200 OK` avec la liste des événements

- **GET /api/events/:id** : Récupérer un événement spécifique
  
  Réponse : `200 OK` avec les détails de l'événement et ses participants

- **POST /api/events/:id/register** : S'inscrire à un événement (authentification requise)
  
  Réponse : `200 OK` avec confirmation de l'inscription

- **POST /api/events/:id/cancel** : Annuler sa participation (authentification requise)
  
  Réponse : `200 OK` avec confirmation de l'annulation

- **GET /api/events/:id/participants** : Récupérer la liste des participants
  
  Réponse : `200 OK` avec la liste des participants et leur statut

### Administration

- **GET /api/admin/db/users** : Récupérer tous les utilisateurs (inclut les mots de passe hashés)
  
  Réponse : `200 OK` avec la liste des utilisateurs

- **GET /api/admin/db/events** : Récupérer tous les événements
  
  Réponse : `200 OK` avec la liste des événements

- **GET /api/admin/db/participants** : Récupérer toutes les participations
  
  Réponse : `200 OK` avec la liste des participations

- **POST /api/admin/db/query** : Exécuter une requête SQL personnalisée
  ```json
  {
    "query": "SELECT * FROM users WHERE email LIKE '%@gmail.com'"
  }
  ```
  Réponse : `200 OK` avec les résultats de la requête

- **GET /api/admin/db/test-connection** : Tester la connexion à la base de données
  
  Réponse : `200 OK` avec statut de la connexion

- **GET /api/admin/db/integrity** : Vérifier l'intégrité de la base de données
  
  Réponse : `200 OK` avec résultats de l'integrity check

- **GET /api/admin/db/errors** : Récupérer les erreurs récentes de la base de données
  
  Réponse : `200 OK` avec la liste des erreurs

- **GET /api/admin/db/backup** : Créer une sauvegarde de la base de données
  
  Réponse : `200 OK` avec informations sur la sauvegarde créée

- **GET /api/admin/db/backups** : Lister les sauvegardes disponibles
  
  Réponse : `200 OK` avec la liste des sauvegardes

- **GET /api/admin/db/restore/:filename** : Restaurer une sauvegarde
  
  Réponse : `200 OK` avec confirmation de la restauration

## Interface d'Administration

L'application dispose d'une interface d'administration pour gérer la base de données :

1. Accédez à `http://localhost:3000/admin`
2. L'interface d'administration vous permet de :
   - Consulter les tables d'utilisateurs, événements et participants
   - Exécuter des requêtes SQL personnalisées
   - Tester la connexion et l'intégrité de la base de données
   - Créer et restaurer des sauvegardes
   - Voir les participants pour chaque événement avec leur statut (inscrit ou annulé)

## Configuration SMTP pour l'envoi d'emails

L'application utilise Nodemailer pour envoyer des emails. Voici comment configurer SMTP pour Gmail :

### Configuration pour Gmail

1. Vous devez avoir activé l'authentification à deux facteurs sur votre compte Google.

2. Générer un mot de passe d'application :
   - Allez sur https://myaccount.google.com/security
   - Dans la section "Connexion à Google", sélectionnez "Mots de passe des applications"
   - Sélectionnez "Autre (nom personnalisé)" et entrez "Hiking App"
   - Cliquez sur "Générer" et copiez le mot de passe de 16 caractères

3. Mettez à jour le fichier `.env` avec vos informations :
   ```
   EMAIL_USER=votre_email@gmail.com
   EMAIL_PASS=votre_mot_de_passe_application
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   ```

### Types d'emails envoyés

L'application envoie des emails pour :
- Vérification de compte (code de vérification)
- Confirmation d'inscription à un événement
- Confirmation d'annulation d'inscription
- Rappels pour les événements à venir

## Développement

- Démarrage du serveur en mode développement : `npm run dev`
- Démarrage du serveur en production : `npm start`

## Structure du projet

```
hiking-server/
├── data/                  # Dossier contenant la base de données SQLite
│   ├── hiking.db          # Fichier de base de données
│   └── backups/           # Sauvegardes de la base de données
├── public/                # Fichiers statiques accessibles publiquement
│   ├── index.html         # Interface utilisateur principale
│   └── admin-db.html      # Interface d'administration
├── src/                   # Code source du serveur
│   ├── middleware/        # Middleware Express
│   ├── routes/            # Définitions des routes API
│   ├── services/          # Services métier
│   ├── db.js              # Configuration de la base de données
│   └── server.js          # Point d'entrée du serveur
├── uploads/               # Dossier pour les images de profil
├── .env                   # Variables d'environnement
├── package.json           # Dépendances et scripts npm
└── README.md              # Documentation
```

## Sécurité

- Les mots de passe sont hashés avec bcrypt
- L'authentification utilise des tokens JWT
- Les routes protégées nécessitent un token valide
- Seules les requêtes SELECT sont autorisées en mode admin pour les requêtes personnalisées

## Licence

MIT
