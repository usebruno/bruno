**English** | [Українська](docs/contributing/contributing_ua.md) | [Русский](docs/contributing/contributing_ru.md) | [Türkçe](docs/contributing/contributing_tr.md) | [Deutsch](docs/contributing/contributing_de.md) | [Français](docs/contributing/contributing_fr.md) | [Português (BR)](docs/contributing/contributing_pt_br.md) | [বাংলা](docs/contributing/contributing_bn.md) | [Español](docs/contributing/contributing_es.md) | [Română](docs/contributing/contributing_ro.md) | [Polski](docs/contributing/contributing_pl.md)

## Let's make bruno better, together !!

We are happy that you are looking to improve bruno. Below are the guidelines to get started bringing up bruno on your computer.

### Technology Stack

Bruno is built using Next.js and React. We also use electron to ship a desktop version (that supports local collections)

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

## Development

Bruno is being developed as a desktop app. You need to load the app by running the Next.js app in one terminal and then run the electron app in another terminal.

### Dependencies

- NodeJS v18

### Local Development

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

### Troubleshooting

You might encounter a `Unsupported platform` error when you run `npm install`. To fix this, you will need to delete `node_modules` and `package-lock.json` and run `npm install`. This should install all the necessary packages needed to run the app.

```shell
# Delete node_modules in sub-directories
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Delete package-lock in sub-directories
find . -type f -name "package-lock.json" -delete
```

### Testing

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

### Raising Pull Request

- Please keep the PR's small and focused on one thing
- Please follow the format of creating branches
  - feature/[feature name]: This branch should contain changes for a specific feature
    - Example: feature/dark-mode
  - bugfix/[bug name]: This branch should contain only bug fixes for a specific bug
    - Example bugfix/bug-1
