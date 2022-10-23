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

You would need [Node v14.x or the latest LTS version](https://nodejs.org/en/) and npm 8.x. We use npm workspaces in the project

### Lets start coding

```bash
# clone and cd into bruno
# use Node 14.x, Npm 8.x

# Install deps (note that we use npm workspaces)
npm i

# run next app
npm run dev:web

# run electron app
# neededonly if you want to test changes related to electron app
# please note that both web and electron use the same code
# if it works in web, then it should also work in electron
npm run dev:electron

# open in browser
open http://localhost:3000
```

### Raising Pull Request

- Please keep the PR's small and focused on one thing
- Please follow the format of creating branches
  - feature/[feature name]: This branch should contain changes for a specific feature
    - Example: feature/dark-mode
  - bugfix/[bug name]: This branch should container only bug fixes for a specific bug
    - Example bugfix/bug-1
