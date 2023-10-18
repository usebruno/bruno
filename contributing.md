**English** | [Українська](/contributing_ua.md) | [Русский](/contributing_ru.md)

## Lets make bruno better, together !!

I am happy that you are looking to improve bruno. Below are the guidelines to get started bringing up bruno on your computer.

### Technology Stack

Bruno is built using NextJs and React. We also use electron to ship a desktop version (that supports local collections)

Libraries we use

- CSS - Tailwind
- Code Editors - Codemirror
- State Management - Redux
- Icons - Tabler Icons
- Forms - formik
- Schema Validation - Yup
- Request Client - axios
- Filesystem Watcher - chokidar

### Dependencies

You would need [Node v18.x or the latest LTS version](https://nodejs.org/en/) and npm 8.x. We use npm workspaces in the project

### Lets start coding

Please reference [development.md](docs/development.md) for instructions on running the local development environment.

### Raising Pull Request

- Please keep the PR's small and focused on one thing
- Please follow the format of creating branches
  - feature/[feature name]: This branch should contain changes for a specific feature
    - Example: feature/dark-mode
  - bugfix/[bug name]: This branch should container only bug fixes for a specific bug
    - Example bugfix/bug-1
