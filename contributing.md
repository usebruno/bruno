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
| [Dutch](docs/contributing/contributing_nl.md)

## Let's make Bruno better, together!!

We are happy that you are looking to improve Bruno. Below are the guidelines to run Bruno on your computer.

### Technology Stack

Bruno is built using React and Electron.

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

> [!IMPORTANT]
> You would need [Node v22.x or the latest LTS version](https://nodejs.org/en/). We use npm workspaces in the project

## Development

Bruno is a desktop app. Below are the instructions to run Bruno.

> Note: We use React for the frontend and rsbuild for build and dev server.

## Install Dependencies

```bash
# use nodejs 22 version
nvm use

# install deps
npm i --legacy-peer-deps
```

### Local Development

#### Build packages

##### Option 1

```bash
# build packages
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common
npm run build:bruno-converters
npm run build:bruno-requests

# bundle js sandbox libraries
npm run sandbox:bundle-libraries --workspace=packages/bruno-js
```
##### Option 2

```bash
# install dependencies and setup
npm run setup
```

#### Run the app

##### Option 1

```bash
# run react app (terminal 1)
npm run dev:web

# run electron app (terminal 2)
npm run dev:electron
```

##### Option 2
```bash
# run electron and react app concurrently
npm run dev
```

#### Customize Electron `userData` path
If `ELECTRON_USER_DATA_PATH` env-variable is present and its development mode, then `userData` path is modified accordingly.

e.g.
```sh
ELECTRON_USER_DATA_PATH=$(realpath ~/Desktop/bruno-test) npm run dev:electron
```
This will create a `bruno-test` folder on your Desktop and use it as the `userData` path.

### Troubleshooting

You might encounter a `Unsupported platform` error when you run `npm install`. To fix this, you will need to delete `node_modules` and `package-lock.json` and run `npm install`. This should install all the necessary packages needed to run the app.

```shell
# Delete node_modules in sub-directories
find ./ -name "node_modules" -type d -exec rm -rf {} +

# Delete package-lock in sub-directories
find . -type f -name "package-lock.json" -delete
```

### Testing

```bash
# run bruno-schema tests
npm run test --workspace=packages/bruno-schema

# run bruno-query tests
npm run test --workspace=packages/bruno-query

# run bruno-common tests
npm run test --workspace=packages/bruno-common

# run bruno-converters tests
npm run test --workspace=packages/bruno-converters

# run bruno-app tests
npm run test --workspace=packages/bruno-app

# run bruno-electron tests
npm run test --workspace=packages/bruno-electron

# run bruno-lang tests
npm run test --workspace=packages/bruno-lang

# run bruno-toml tests
npm run test --workspace=packages/bruno-toml

# run tests over all workspaces
npm test --workspaces --if-present
```

### Raising Pull Requests

- Please keep the PR's small and focused on one thing
- Please follow the format of creating branches
  - feature/[feature name]: This branch should contain changes for a specific feature
    - Example: feature/dark-mode
  - bugfix/[bug name]: This branch should contain only bug fixes for a specific bug
    - Example bugfix/bug-1
