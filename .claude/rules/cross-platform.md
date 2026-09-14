---
paths:
  - "scripts/**/*"
  - "packages/bruno-electron/**/*"
---

# Cross-Platform Guidelines

This is an Electron app targeting macOS, Windows, and Linux. All code touching the filesystem, child processes, signals, or paths must work on all three platforms.

## Filesystem

- `fs.rmSync` with `force: true` only suppresses `ENOENT`, NOT `EPERM`/`EBUSY`. Windows locks files aggressively (antivirus, indexing, open handles). Always use `maxRetries` and `retryDelay` when deleting directories.
- Use `path.join()` / `path.resolve()` for all paths — never hardcode `/` separators.
- Windows paths are case-insensitive. Use `normalizePath()` (from `utils/common/path`) when comparing collection/workspace paths.
- `app.getPath()` returns platform-specific directories (`userData`, `documents`, etc.). Never assume POSIX-style locations.
- File watchers (chokidar) may emit different event orderings across platforms. Don't depend on specific add/change/unlink sequences.

## Child Processes

- `spawn('npm', [...])` requires `shell: true` on Windows because `npm` is `npm.cmd`.
- `child.kill()` with `shell: true` only kills the shell wrapper (`cmd.exe`) on Windows, leaving orphaned children. Use `taskkill /pid <pid> /T /F` to kill the entire process tree on Windows.
- `execSync` / `spawn` commands must avoid Unix-only syntax (`&&` chains work in cmd.exe, but pipes and redirects differ).

## Signals & Shutdown

- `SIGINT` / `SIGTERM` are unreliable on Windows with `shell: true`. Also handle `SIGHUP` as fallback.
- App shutdown must close all file watchers. Each watcher class implements `closeAllWatchers()`, orchestrated by `closeAllWatchers()` in `index.js`.

## Line Endings

- Files authored on Windows use CRLF. When parsing multiline `.bru`/text blocks line by line, split with a CRLF-aware regex (`/\r\n|\r|\n/`), never on `\n` alone — a trailing `\r` otherwise leaks into parsed values and causes spurious dirty-state and diffs. the `.split(/\r\n|\r|\n/)` in `bruno-lang`'s `v2/src/envToJson.js` is the reference pattern; keep new parsers consistent with it.

## stdout vs stderr

- Dev tools (rsbuild, webpack, electron-builder) may route startup output to stderr on Windows. When detecting patterns in process output, check both streams.

## Platform-Specific Dependencies

- `forceInstallPlatformDeps()` in `scripts/setup.js` installs platform-specific native modules (e.g., `@lydell/node-pty-{platform}-{arch}`).
- Electron builder config handles platform-specific packaging (`mac`/`win`/`linux` targets).

## Path Separators in Collection/Workspace Stores

- electron-store persists paths as-is. A workspace opened on macOS stores `/Users/...`, on Windows `C:\Users\...`.
- `ELECTRON_USER_DATA_PATH` only applies when `isDev` is true (`index.js:22`).
