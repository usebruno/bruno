[English](contributing.md) | [Українська](/contributing_ua.md) | [Русский](/contributing_ru.md) | [Türkçe](/contributing_tr.md) | [Deutsch](/contributing_de.md) | **Français**

## Ensemble, améliorons Bruno !

Je suis ravi que vous souhaitiez améliorer Bruno. Voici les directives pour commencer à faire fonctionner Bruno sur votre ordinateur.

### Technologies utilisées

Bruno est développé en utilisant Next.js et React. Nous utilisons également Electron pour proposer une version de bureau (qui prend en charge les collections locales).

Bibliothèques que nous utilisons

- CSS - Tailwind
- Éditeurs de code - Codemirror
- Gestion de l'état - Redux
- Icônes - Tabler Icons
- Formulaires - formik
- Validation de schéma - Yup
- Client de requêtes - axios
- Observateur de système de fichiers - chokidar

### Dépendances

Vous aurez besoin de [Node v18.x ou de la dernière version LTS](https://nodejs.org/fr/) et de npm 8.x. Nous utilisons des espaces de travail npm dans le projet.

### Commençons à coder

Veuillez consulter [documentation de développement](docs/development_fr.md) pour obtenir des instructions sur l'exécution de l'environnement de développement local.

### Soumettre une Pull Request

- Veuillez garder les PR (Pull Requests) petites et axées sur un seul objectif.
- Veuillez suivre le format de création des branches
  - feature/[nom de la fonction] : Cette branche doit contenir des modifications pour une fonctionnalité spécifique
    - Exemple : feature/mode-sombre
  - bugfix/[nom du bug] : Cette branche doit contenir uniquement des corrections de bug pour un bug spécifique
    - Exemple : bugfix/bug-1

J'espère que cela vous aide. Si vous avez d'autres questions ou besoin de plus d'informations, n'hésitez pas à nous le demander !
