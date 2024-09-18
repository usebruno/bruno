[English](../../contributing.md)

## Ensemble, améliorons Bruno !

Je suis content de voir que vous envisagez d'améliorer Bruno. Vous trouverez ci-dessous les règles et guides pour récupérer Bruno sur votre ordinateur.

### Technologies utilisées

Bruno est basé sur NextJs et React. Nous utilisons aussi Electron pour embarquer la version ordinateur (ce qui permet les collections locales).

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

Vous aurez besoin de [Node v20.x ou la dernière version LTS](https://nodejs.org/en/) et npm 8.x. Nous utilisons aussi les espaces de travail npm (_npm workspaces_) dans ce projet.

## Développement

Bruno est développé comme une application _client lourd_. Vous devrez charger l'application en démarrant nextjs dans un premier terminal, puis démarre l'application Electron dans un second.

### Dépendances

- NodeJS v18

### Développement local

```bash
# utiliser node en version 18
nvm use

# installation des dépendances
npm i --legacy-peer-deps

# construction des docs graphql
npm run build:graphql-docs

# construction de bruno query
npm run build:bruno-query

# construction de bruno common
npm run build:bruno-common

# démarrage de next (terminal 1)
npm run dev:web

# démarrage du client lourd (terminal 2)
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
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

### Ouvrir une Pull Request

- Merci de conserver les PR minimes et focalisées sur un seul objectif
- Merci de suivre le format de nom des branches :
  - feature/[feature name]: Cette branche doit contenir une fonctionnalité spécifique
    - Exemple : feature/dark-mode
  - bugfix/[bug name]: Cette branche doit contenir seulement une solution pour un bug spécifique
    - Exemple : bugfix/bug-1
