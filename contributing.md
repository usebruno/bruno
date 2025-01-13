**English**
| [Українська](docs/contributing/contributing_ua.md)
| [Русский](docs/contributing/contributing_ru.md)
| [Türkçe](docs/contributing/contributing_tr.md)
| [Deutsch](docs/contributing/contributing_de.md)
| [Français](docs/contributing/contributing_fr.md)
| [Português (BR)](docs/contributing/contributing_pt_br.md)
| [한국어](docs/contributing/contributing_kr.md)
| [বাংলা](docs/contributing/contributing_bn.md)
| [Español](docs/contributing/contributing_es.md)
| [Italiano](docs/contributing/contributing_it.md)
| [Română](docs/contributing/contributing_ro.md)
| [Polski](docs/contributing/contributing_pl.md)
| [简体中文](docs/contributing/contributing_cn.md)
| [正體中文](docs/contributing/contributing_zhtw.md)
| [日本語](docs/contributing/contributing_ja.md)
| [हिंदी](docs/contributing/contributing_hi.md)
| [Nederlands](docs/contributing/contributing_nl.md)

## Let's make Bruno better, together!!

We are happy that you are looking to improve Bruno. Below are the guidelines to get started bringing up Bruno on your computer.

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
- i18n - i18next

### Dependencies

You would need [Node v20.x or the latest LTS version](https://nodejs.org/en/) and npm 8.x. We use npm workspaces in the project

## Development

Bruno is being developed as a desktop app. You need to load the app by running the Next.js app in one terminal and then run the electron app in another terminal.

### Local Development

```bash
# use nodejs 20 version
nvm use

# install deps
npm i --legacy-peer-deps

# build packages
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common

# bundle js sandbox libraries
npm run sandbox:bundle-libraries --workspace=packages/bruno-js

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

### Raising Pull Requests

- Please keep the PR's small and focused on one thing
- Please follow the format of creating branches
  - feature/[feature name]: This branch should contain changes for a specific feature
    - Example: feature/dark-mode
  - bugfix/[bug name]: This branch should contain only bug fixes for a specific bug
    - Example bugfix/bug-1
