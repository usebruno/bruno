[English](../../contributing.md)

## Ensemble, améliorons Bruno !

Je suis content de voir que vous envisagez d'améliorer Bruno. Vous trouverez ci-dessous les règles et guides pour récupérer Bruno sur votre ordinateur.

### Technologies utilisées

Bruno utilise React pour l'interface et Electron pour l'application de bureau (ce qui permet les collections locales).

Les librairies que nous utilisons :

- CSS - Tailwind
- Code Editors - Codemirror
- State Management - Redux
- Icons - Tabler Icons
- Forms - formik
- Schema Validation - Yup
- Request Client - axios
- Filesystem Watcher - chokidar

### Dépendances

Vous aurez besoin de [Node.js](https://nodejs.org/en/) dans la version indiquée dans [`.nvmrc`](../../.nvmrc), ainsi que de npm. Nous utilisons aussi les espaces de travail npm (_npm workspaces_) dans ce projet.

## Développement

Bruno est une application de bureau. L'interface utilise React, avec rsbuild pour la compilation et le serveur de développement.

### Développement local

#### 1. Installation

```bash
# utiliser la version de Node.js indiquée dans .nvmrc
nvm use

# installer les dépendances et construire les paquets partagés
npm run setup
```

`npm run setup` supprime les répertoires `node_modules` existants, installe les dépendances et les modules propres à la plateforme, construit les paquets partagés et prépare les bibliothèques du bac à sable JavaScript.

#### 2. Démarrage de l'application

```bash
# démarrer l'interface React et Electron simultanément
npm run dev
```

Vous pouvez aussi démarrer les deux processus séparément :

```bash
# démarrer l'interface React (terminal 1)
npm run dev:web

# démarrer l'application Electron (terminal 2)
npm run dev:electron
```

### Dépannage

Vous pourriez rencontrer une erreur `Unsupported platform` durant le lancement de `npm install`. Pour résoudre cela, veuillez supprimer le répertoire `node_modules` ainsi que le fichier `package-lock.json` et lancez à nouveau `npm install`. Cela devrait installer tous les paquets nécessaires pour lancer l'application.

```shell
# Efface les répertoires node_modules dans les sous-répertoires
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Efface les fichiers package-lock.json dans les sous-répertoires
find . -type f -name "package-lock.json" -delete
```

### Tests

```bash
# exécuter des tests de schéma bruno
npm test --workspace=packages/bruno-schema

# exécuter des tests sur tous les espaces de travail
npm test --workspaces --if-present
```

### Ouvrir une Pull Request

- Merci de conserver les PR minimes et focalisées sur un seul objectif
- Merci de suivre le format de nom des branches :
  - feature/[feature name]: Cette branche doit contenir une fonctionnalité spécifique
    - Exemple : feature/dark-mode
  - bugfix/[bug name]: Cette branche doit contenir seulement une solution pour un bug spécifique
    - Exemple : bugfix/bug-1
