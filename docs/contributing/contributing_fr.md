## Ensemble, améliorons Bruno !

Je suis content de voir que vous envisagez améliorer Bruno. Ci-dessous, vous trouverez les règles et guides pour récupérer Bruno sur votre ordinateur.

### Technologies utilisées

Bruno est construit en utilisant NextJs et React. Nous utilisons aussi Electron pour embarquer la version ordinateur (qui permet les collections locales).

Les bibliothèques que nous utilisons :

- CSS - Tailwind
- Code Editors - Codemirror
- State Management - Redux
- Icons - Tabler Icons
- Forms - formik
- Schema Validation - Yup
- Request Client - axios
- Filesystem Watcher - chokidar

### Dépendances

Vous aurez besoin de [Node v18.x ou la dernière version LTS](https://nodejs.org/en/) et npm 8.x. Nous utilisons aussi les espaces de travail npm (_npm workspaces_) dans ce projet.

### Commençons à coder

Veuillez vous référez à la [documentation de développement](docs/development_fr.md) pour les instructions de démarrage de l'environnement de développement local.

### Ouvrir une Pull Request

- Merci de conserver les PR petites et focalisées sur un seul objectif
- Merci de suivre le format de nom des branches
  - feature/[feature name]: Cette branche devrait contenir une fonctionnalité spécifique
    - Exemple: feature/dark-mode
  - bugfix/[bug name]: Cette branche devrait contenir seulement une solution pour pour une bogue spécifique
    - Exemple: bugfix/bug-1

## Développement

Bruno est développé comme une application de _lourde_. Vous devez charger l'application en démarrant nextjs dans un terminal, puis démarre l'application Electron dans un autre terminal.

### Dépendances

- NodeJS v18

### Développement local

```bash
# use nodejs 18 version
nvm use

# install deps
npm i --legacy-peer-deps

# build graphql docs
npm run build:graphql-docs

# build bruno query
npm run build:bruno-query

# run next app (terminal 1)
npm run dev:web

# run electron app (terminal 2)
npm run dev:electron
```

### Dépannage

Vous pourriez rencontrer une error `Unsupported platform` pendant le lancement de `npm install`. Pour résoudre cela, veuillez supprimer le répertoire `node_modules`, le fichier `package-lock.json` et lancer à nouveau `npm install`. Cela devrait isntaller tous les paquets nécessaires pour lancer l'application.

```shell
# Delete node_modules in sub-directories
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Delete package-lock in sub-directories
find . -type f -name "package-lock.json" -delete
```

### Tests

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```
