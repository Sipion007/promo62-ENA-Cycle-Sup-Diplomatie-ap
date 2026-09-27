# Promo 62 – ENA Diplomatie

Plateforme communautaire privée pour la Promo 62 ENA Diplomatie

## Installation & Démarrage

### Prérequis
- Node.js 14+ installé
- npm

### Étapes

1. **Installer les dépendances**
```bash
npm install
```

2. **Démarrer le serveur**
```bash
npm start
```

Le serveur démarre sur `http://localhost:3000`

3. **Accéder à l'application**
Ouvrir un navigateur et aller à `http://localhost:3000`

## Comptes de test

### Admin
- Email: `admin@promo62.ena`
- Mot de passe: `admin123`

### Étudiant
Créer un nouveau compte avec l'option "Créer un compte"

## Fonctionnalités

### Dashboard Étudiant
- Voir ses notes
- Consulter l'emploi du temps personnel
- Accéder aux documents (cours, syllabus)
- Voir les événements à venir
- Participer au forum

### Panneau Admin
- Gérer les documents
- Gérer l'emploi du temps
- Gérer les notes des étudiants
- Créer les événements
- Voir la liste des membres

### Forum
- Poster des messages
- Voir les posts des autres
- Partager photos et discussions

## Architecture

```
promo62-app/
├── server.js              # Serveur Express + API
├── package.json           # Dépendances
├── promo62.db            # Base de données SQLite
└── public/
    ├── index.html        # Interface HTML
    ├── app.js            # Logique JavaScript
    ├── manifest.json     # Configuration PWA
    └── service-worker.js # Service Worker (offline)
```

## Base de données

La base de données SQLite contient les tables suivantes:
- `users` - Utilisateurs (étudiants + admin)
- `documents` - Documents partagés
- `schedule` - Emploi du temps
- `grades` - Notes des étudiants
- `events` - Événements scolaires
- `forum_posts` - Messages du forum

## API Endpoints

### Authentication
- `POST /api/auth/login` - Connexion
- `POST /api/auth/register` - Inscription

### Documents
- `GET /api/documents` - Lister les documents
- `POST /api/documents` - Ajouter un document (admin)

### Schedule
- `GET /api/schedule` - Obtenir l'emploi du temps
- `POST /api/schedule` - Ajouter un cours (admin)

### Grades
- `GET /api/grades` - Obtenir les notes
- `POST /api/grades` - Ajouter une note (admin)

### Events
- `GET /api/events` - Lister les événements
- `POST /api/events` - Créer un événement (admin)

### Forum
- `GET /api/forum` - Lister les posts
- `POST /api/forum` - Poster un message

### Users
- `GET /api/users` - Lister les utilisateurs (admin)

## Notes importantes

1. **Authentification**: Utilise JWT tokens
2. **PWA**: L'app fonctionne offline avec le service worker
3. **Base de données**: SQLite est créée automatiquement au premier lancement
4. **CORS**: Activé pour permettre les requêtes frontend

## Prochaines étapes

- [ ] Ajouter upload de fichiers
- [ ] Ajouter notifications
- [ ] Ajouter des photos au forum
- [ ] Ajouter édition/suppression de posts
- [ ] Ajouter recherche
- [ ] Améliorer le design mobile
- [ ] Déploiement sur serveur

## Support

Pour plus d'aide, contactez Emade
