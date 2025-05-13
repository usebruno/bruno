[English](../../contributing.md)

## Ensemble, améliorons Bruno !

Je suis content de voir que vous envisagez d'améliorer Bruno. Vous trouverez ci-dessous les règles pour exécuter Bruno sur votre ordinateur.

### Pile technologique

Bruno est développé avec React et utilise Electron pour une version bureau (avec prise en charge des collections locales).

Bibliothèques utilisées

- CSS - Tailwind
- Éditeurs de code - Codemirror
- Gestion d'état - Redux
- Icônes - Icônes Tabler
- Formulaires - formik
- Validation de schéma - Yup
- Client de requêtes - axios
- Observateur de système de fichiers - chokidar
- i18n - i18next

> [!IMPORTANT]
> Vous aurez besoin de [Node v22.x ou de la dernière version LTS](https://nodejs.org/en/). Nous utilisons les espaces de travail npm dans le projet.

## Développement

Bruno est une application de bureau. Vous devez charger l'application en exécutant séparément le frontend et l'application Electron.

> Remarque : Nous utilisons React pour le frontend et rsbuild pour les serveurs de build et de développement.

## Installer les dépendances

```bash
# utiliser la version 22 de NodeJS
nvm use

# installer les dépendances
npm i --legacy-peer-deps
```

### Développement local (Option 1)

```bash
# créer les paquets
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common
npm run build:bruno-converters
npm run build:bruno-requests

# regrouper les bibliothèques sandbox JS
npm run sandbox:bundle-libraries --workspace=packages/bruno-js

# exécuter l'application React (terminal 1)
npm run dev:web

# exécuter l'application Electron (terminal 2)
npm run dev:electron
```

### Développement local (Option 2)

```bash
# installer les dépendances et les configurer
npm run setup

# Exécuter les applications Electron et React simultanément
npm run dev
```

### Dépannage

Vous pourriez rencontrer une erreur « Plateforme non prise en charge » lors de l'exécution de « npm install ». Pour résoudre ce problème, supprimez « node_modules » et « package-lock.json », puis exécutez « npm install ». Cela devrait installer tous les packages nécessaires à l'exécution de l'application.

```shell
# Supprimer « node_modules » dans les sous-répertoires
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
rm -rf "$dir"
done

# Supprimer « package-lock » dans les sous-répertoires
find . -type f -name "package-lock.json" -delete
```

### Tests

```bash
# Exécuter les tests bruno-schema
npm test --workspace=packages/bruno-schema

# Exécuter les tests sur tous les espaces de travail
npm test --workspaces --if-present
```

### Ouvrir une Pull Request

- Veuillez limiter les PR à un seul élément.
- Veuillez respecter le format de création des branches.
- feature/[nom de la fonctionnalité] : Cette branche doit contenir les modifications d'une fonctionnalité spécifique.
- Exemple : feature/dark-mode
- bugfix/[nom du bug] : Cette branche doit contenir uniquement les corrections de bugs pour un bug spécifique.
- Exemple : bugfix/bug-1