# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bruno is an offline-first, open-source API client built with React and Electron. It stores collections as plain text files in a custom `.bru` markup language, enabling Git-based collaboration without cloud sync.

## Technology Stack

- **Frontend**: React 19, Redux Toolkit, Tailwind CSS
- **Build Tool**: Rsbuild (modern replacement for webpack)
- **Desktop**: Electron 37
- **Code Editors**: CodeMirror 5
- **State Management**: Redux with custom middleware (tasks, draft detection, debug)
- **Icons**: Tabler Icons
- **Forms**: Formik + Yup validation
- **i18n**: i18next
- **File Watching**: chokidar
- **HTTP Client**: axios (with NTLM, AWS SigV4, proxy support)
- **Script Execution**: Custom VM2 implementation

## Architecture

Bruno is structured as an npm workspace monorepo with the following key packages:

### Core Packages

- **bruno-app** - React frontend application (packages/bruno-app)
  - Built with Rsbuild
  - Uses Redux for state management with slices for: app, collections, tabs, notifications, global-environments, logs, performance
  - Custom middlewares: tasks middleware, draft detection, debug middleware
  - Structure: components/, pages/, providers/, hooks/, utils/, selectors/

- **bruno-electron** - Electron main/renderer processes (packages/bruno-electron)
  - IPC handlers in src/ipc/ for: filesystem, network requests, preferences, global-environments, notifications
  - Main process handles file system operations and network requests
  - Preload script bridges renderer and main processes

- **bruno-cli** - Command-line interface (packages/bruno-cli)
  - Binary: `bru`
  - Runs collections from command line for CI/CD integration

### Supporting Packages

- **bruno-lang** - Custom .bru file format parser (uses ohm-js grammar)
  - v1 and v2 parsers
  - Converts between .bru files and JSON

- **bruno-common** - Shared utilities (TypeScript)
- **bruno-schema** - Yup validation schemas for Bruno data structures
- **bruno-query** - Query utilities for filtering/searching collections
- **bruno-js** - JavaScript execution sandbox for pre/post request scripts
- **bruno-requests** - HTTP request execution logic (TypeScript)
- **bruno-filestore** - File system operations for collections (TypeScript)
- **bruno-converters** - Import/export converters (Postman, Insomnia, OpenAPI, etc.)
- **bruno-graphql-docs** - GraphQL schema introspection and documentation
- **bruno-toml** - TOML parsing utilities

## Development Commands

### Setup
```bash
# Use Node 22 (required)
nvm use

# Install dependencies
npm i --legacy-peer-deps

# Build all packages and setup
npm run setup

# Or build packages individually
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common
npm run build:bruno-converters
npm run build:bruno-requests
npm run build:bruno-filestore
npm run sandbox:bundle-libraries --workspace=packages/bruno-js
```

### Development
```bash
# Run both web and electron concurrently
npm run dev

# Or run separately
npm run dev:web        # React dev server (terminal 1)
npm run dev:electron   # Electron app (terminal 2)

# Debug electron with inspector
npm run dev:electron:debug

# Watch mode for packages
npm run watch:common
npm run watch:converters
```

### Testing
```bash
# E2E tests with Playwright
npm run test:e2e
npm run test:e2e:ssl

# Unit tests per package
npm run test --workspace=packages/bruno-schema
npm run test --workspace=packages/bruno-query
npm run test --workspace=packages/bruno-common
npm run test --workspace=packages/bruno-converters
npm run test --workspace=packages/bruno-app
npm run test --workspace=packages/bruno-electron
npm run test --workspace=packages/bruno-lang
npm run test --workspace=packages/bruno-toml

# All workspace tests
npm test --workspaces --if-present
```

### Linting & Formatting
```bash
# Lint (uses eslint-plugin-diff to only lint changed files)
npm run lint

# Fix lint issues
npm run lint:fix

# Format web app
npm run prettier:web

# Test prettier formatting
npm run test:prettier:web
```

### Building
```bash
# Build web app
npm run build:web

# Build Electron for specific platforms
npm run build:electron:mac
npm run build:electron:win
npm run build:electron:linux
npm run build:electron:deb
npm run build:electron:rpm
npm run build:electron:snap
```

## Key Architectural Patterns

### IPC Communication
The Electron app uses IPC (Inter-Process Communication) for frontend-backend interaction:
- IPC handlers are in `packages/bruno-electron/src/ipc/`
- Network requests are executed in the main process (src/ipc/network/)
- Frontend dispatches IPC calls via the preload script

### Redux State Management
- Redux store configured in `packages/bruno-app/src/providers/ReduxStore/`
- Slices organize state by domain: collections, tabs, app, notifications, etc.
- Custom middleware intercepts actions for side effects (tasks, drafts)

### .bru File Format
Collections are stored as plain text `.bru` files:
- Parsed by bruno-lang package using ohm-js grammar
- Enables Git-based version control
- bruno-filestore handles reading/writing these files

### Request Execution Flow
1. Frontend (bruno-app) dispatches action
2. IPC call to main process (bruno-electron)
3. bruno-requests executes HTTP request with bruno-js for scripts
4. Response sent back via IPC
5. Redux state updated, UI rerenders

## Code Style

- ESLint configured with @stylistic plugin
- 2-space indentation, single quotes, semicolons required
- Uses eslint-plugin-diff to only lint changed files
- Brace style: 1tbs (one true brace style)
- Arrow functions require parentheses
- Pre-commit hooks: husky + nano-staged auto-fix lint issues

## Branch Naming Convention

- `feature/[feature-name]` - New features
- `bugfix/[bug-name]` - Bug fixes

## Custom Electron userData Path

For development, set `ELECTRON_USER_DATA_PATH` to customize where Bruno stores data:
```bash
ELECTRON_USER_DATA_PATH=$(realpath ~/Desktop/bruno-test) npm run dev:electron
```

## Important Notes

- Always use `npm i --legacy-peer-deps` due to dependency conflicts
- Node v22.x is required (see .nvmrc)
- The project uses npm workspaces - never run npm install in individual packages
- Rsbuild is used instead of webpack for faster builds
- React 19 is used with the experimental compiler
