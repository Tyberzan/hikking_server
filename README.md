# Hiking Server API

Une API RESTful pour gérer des événements de randonnée et des profils utilisateurs.

## Configuration

1. Installez les dépendances :
   ```
   npm install
   ```

2. Configurez les variables d'environnement en modifiant le fichier `.env` :
   ```
   PORT=3000
   JWT_SECRET=votre_clé_secrète_ici
   EMAIL_USER=votre_email@exemple.com
   EMAIL_PASS=votre_mot_de_passe
   EMAIL_HOST=smtp.exemple.com
   EMAIL_PORT=587
   ```

3. Démarrez le serveur :
   ```
   npm run dev
   ```

## Structure de la base de données

L'application utilise SQLite avec les tables suivantes :

- **users** : profils utilisateurs avec authentification
- **events** : événements de randonnée
- **participants** : jonction entre utilisateurs et événements

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

- **POST /api/auth/verify** : Vérification d'email avec code
  ```json
  {
    "email": "utilisateur@exemple.com",
    "code": "code_reçu_par_email"
  }
  ```

- **POST /api/auth/login** : Connexion
  ```json
  {
    "email": "utilisateur@exemple.com",
    "password": "mot_de_passe"
  }
  ```

### Utilisateurs

- **GET /api/users/me** : Récupérer le profil de l'utilisateur connecté (authentification requise)

- **POST /api/users/profile-picture** : Télécharger une image de profil (authentification requise)
  ```
  Formulaire multipart avec champ "profilePicture"
  ```

- **GET /api/users/events** : Récupérer les événements de l'utilisateur (authentification requise)

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

- **GET /api/events** : Récupérer tous les événements
  Paramètres optionnels : `dateFrom`, `dateTo`, `difficulty`

- **GET /api/events/:id** : Récupérer un événement spécifique

- **POST /api/events/:id/register** : S'inscrire à un événement (authentification requise)

- **POST /api/events/:id/cancel** : Annuler sa participation (authentification requise)

- **GET /api/events/:id/participants** : Récupérer la liste des participants

## Intégration avec C#

Pour intégrer cette API avec une application C#, utilisez HttpClient pour effectuer des requêtes HTTP vers ces endpoints. Exemple :

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

public class HikingApiClient
{
    private readonly HttpClient _client;
    private string _token;

    public HikingApiClient(string baseUrl)
    {
        _client = new HttpClient();
        _client.BaseAddress = new Uri(baseUrl);
    }

    public async Task<bool> Login(string email, string password)
    {
        var content = new StringContent(
            JsonConvert.SerializeObject(new { email, password }),
            Encoding.UTF8,
            "application/json");

        var response = await _client.PostAsync("/api/auth/login", content);
        
        if (response.IsSuccessStatusCode)
        {
            var result = await response.Content.ReadAsStringAsync();
            var data = JsonConvert.DeserializeObject<dynamic>(result);
            _token = data.token;
            _client.DefaultRequestHeaders.Add("x-auth-token", _token);
            return true;
        }
        
        return false;
    }

    // Autres méthodes pour interagir avec l'API...
}
```

## Développement

- Démarrage du serveur en mode développement : `npm run dev`
- Démarrage du serveur en production : `npm start` #   h i k k i n g _ s e r v e r  
 