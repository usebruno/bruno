[English](/contributing.md) | [Українська](/contributing_ua.md) | [Русский](/contributing_ru.md) | [Türkçe](/contributing_tr.md) | [Deutsch](/contributing_de.md)  | **Français** | [Español](/contributing_es.md)

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
