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
| [Slovenčina](docs/contributing/contributing_sk.md)
| [فارسی](docs/contributing/contributing_fa.md)

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
> You would need [Node v22.x or the latest LTS version](https://nodejs.org/en/) (the exact version is pinned in `.nvmrc`). We use npm workspaces in the project

### Project Structure

All packages live under `packages/`:

| Package | Description |
| --- | --- |
| `bruno-app` | React frontend (renderer) |
| `bruno-electron` | Electron desktop app (main process) |
| `bruno-cli` | Command line interface to run collections |
| `bruno-common` | Shared utilities |
| `bruno-requests` | Request handling (auth, network, etc.) |
| `bruno-converters` | Import/export converters (Postman, Insomnia, OpenAPI, etc.) |
| `bruno-filestore` | File storage and parsing of collection files |
| `bruno-sqlite` | SQLite storage layer |
| `bruno-lang` | `.bru` language parser |
| `bruno-toml` | TOML parser |
| `bruno-schema` / `bruno-schema-types` | Schema validation and shared types |
| `bruno-js` | Script, test, vars and assert runtimes |
| `bruno-query` | Query with deep navigation, filter and map support |
| `bruno-graphql-docs` | GraphQL documentation explorer |
| `bruno-tests` | Test collection and server used by CLI tests |

End-to-end (Playwright) tests live in the top-level `tests/` directory.

## Development

Bruno is a desktop app. Below are the instructions to run Bruno.

> Note: We use React for the frontend and rsbuild for build and dev server.

### Local Development

#### 1. Setup

```bash
# use the node version from .nvmrc
nvm use

# install dependencies and build all packages
npm run setup
```

`npm run setup` does the following for you:

- removes existing `node_modules` directories
- installs dependencies (`npm i --legacy-peer-deps`) and platform-specific native modules
- builds the shared packages: `graphql-docs`, `bruno-query`, `bruno-common`, `bruno-converters`, `bruno-requests`, `schema-types`, `bruno-filestore` and `bruno-sqlite`
- bundles the JS sandbox libraries for `bruno-js`

#### 2. Run the app

```bash
# run electron and react app concurrently
npm run dev

# or, with hot-reload of the electron main process
npm run dev:watch
```

You can also run them separately:

```bash
# run react app (terminal 1)
npm run dev:web

# run electron app (terminal 2)
npm run dev:electron
```

#### Rebuilding shared packages

`npm run dev` does **not** rebuild the shared packages. If you change one of them (e.g. `bruno-common`, `bruno-requests`, `bruno-filestore`, `bruno-sqlite`), rebuild it so the app picks up your changes:

```bash
npm run build:bruno-common
npm run build:bruno-requests
npm run build:bruno-filestore
npm run build:bruno-sqlite

# or run a watcher while developing
npm run watch:common
npm run watch:requests
npm run watch:converters
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
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Delete package-lock in sub-directories
find . -type f -name "package-lock.json" -delete
```

### Testing

Add tests along with your changes:

- **Unit tests** (Jest) for logic changes — place them in the package you're changing.
- **End-to-end tests** (Playwright) for user-facing changes in the app — see the [Playwright testing guide](docs/playwright-testing-guide.md).

#### Unit tests

```bash
# run tests for a single package
npm run test --workspace=packages/bruno-app
npm run test --workspace=packages/bruno-electron
npm run test --workspace=packages/bruno-cli
npm run test --workspace=packages/bruno-common
npm run test --workspace=packages/bruno-requests
npm run test --workspace=packages/bruno-converters
npm run test --workspace=packages/bruno-filestore
npm run test --workspace=packages/bruno-sqlite
npm run test --workspace=packages/bruno-js
npm run test --workspace=packages/bruno-lang
npm run test --workspace=packages/bruno-schema
npm run test --workspace=packages/bruno-query
npm run test --workspace=packages/bruno-toml

# run a single test file
npm run test --workspace=packages/bruno-app -- path/to/file.spec.js

# run tests over all workspaces
npm test --workspaces --if-present
```

#### End-to-end tests

```bash
# run the e2e test suite
npm run test:e2e

# run a single e2e test file
npx playwright test tests/collection/create-collection.spec.ts --project=default
```

### Linting

```bash
npm run lint:fix
```

Please also follow our [coding standards](CODING_STANDARDS.md).

### Raising Pull Requests

- Please keep the PR's small and focused on one thing
- Add unit and/or e2e tests that cover your change where applicable
- Please follow the format of creating branches
  - feature/[feature name]: This branch should contain changes for a specific feature
    - Example: feature/dark-mode
  - bugfix/[bug name]: This branch should contain only bug fixes for a specific bug
    - Example bugfix/bug-1
