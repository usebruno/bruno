# Bruno - Open-source API Client

Bruno is a fast and open-source IDE for exploring and testing APIs. It is built using Electron and React, and it focuses on local-first data storage using the `.bru` file format (plain text).

## Project Overview

- **Core Technologies:** Electron, React, Redux Toolkit, Node.js.
- **Frontend:** `packages/bruno-app` (React with Rsbuild, Tailwind CSS).
- **CLI:** `packages/bruno-cli` (Node.js based command line tool).
- **Engine:** `packages/bruno-js`, `packages/bruno-lang` (Core logic for script execution and `.bru` parsing).
- **Architecture:** Monorepo using npm workspaces.

## Key Commands

- **Install Dependencies:** `npm install` (from the root).
- **Development (App):** `npm run dev:app` (starts the React app and Electron).
- **Development (CLI):** `cd packages/bruno-cli && npm install && ./bin/bru --version`.
- **Testing:**
  - Run all tests: `npm test`.
  - Run specific app tests: `npm test packages/bruno-app`.
- **Build:** `npm run build:electron`.

## Development Conventions

- **State Management:** Uses Redux Toolkit slices (located in `packages/bruno-app/src/providers/ReduxStore/slices`).
- **Components:** Functional components with React Hooks are preferred.
- **Styling:** Tailwind CSS and Styled-components are used in `bruno-app`.
- **Hotkeys:** Managed via Mousetrap in `HotkeysProvider`.
- **File Format:** Data is persisted in `.bru` files (DSL-based).
- **Testing:** Jest for unit tests and Playwright for E2E tests.

## Instructions for Gemini CLI

- **Monorepo Awareness:** Always verify which package you are working in (`bruno-app`, `bruno-cli`, etc.).
- **Redux Interoperability:** When modifying state, ensure consistency between slices (e.g., `tabs` and `collections`).
- **Path Handling:** Use the `utils/common/path` helper for cross-platform path consistency.
- **Surgical Edits:** Prefer the `replace` tool for targeted changes in large files like `tabs.js` or `index.js`.
- **Verification:** Always run `npm test` on the relevant package after making changes.

## Pull Request Protocol (Personal/Local Guidelines)

To maintain a clean contribution workflow and protect personal configuration files:

1. **Branch Management:**
   - NEVER commit directly to `main`.
   - Always create a descriptive feature branch (`feat/issue-description-ID`) from an updated `main`.
   - Keep `main` locally synced with `upstream/main` (the official Bruno repository).

2. **Personal Files Protection:**
   - `GEMINI.md` is a personal instructional file and MUST NOT be included in any PR.
   - It is added to `.gitignore` locally.
   - The modification to `.gitignore` is hidden using `git update-index --assume-unchanged .gitignore`.

3. **Staging and Committing:**
   - Be surgical: prefer staging specific files over `git add .`.
   - Always check `git status` before committing to ensure no unintended files are included.
   - If `.gitignore` needs an actual update for the project, run `git update-index --no-assume-unchanged .gitignore` first, apply the change, commit, and then hide it again.

4. **PR Creation:**
   - Use `gh pr create` with the `--head your-username:your-branch` flag to ensure the PR is created from your fork towards the official repository.
   - Use a temporary file for the PR body if it contains complex characters to avoid shell interpretation errors.
