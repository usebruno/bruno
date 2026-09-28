---
paths:
  - "packages/bruno-electron/**/*"
---

# Electron Main Process Guide

The main process (`packages/bruno-electron/src/index.js`) owns the filesystem, network, child
processes, and all electron-store data. The renderer reaches it **only** over IPC through the
preload bridge — there is no direct Node access in the renderer despite `nodeIntegration: true`
(see Security below). Before adding or changing any IPC, read this file plus the target
`src/ipc/<domain>.js` handler.

## Preload bridge & renderer access

`src/preload.js` is the *only* surface the renderer sees. It exposes, via
`contextBridge.exposeInMainWorld('ipcRenderer', …)`, exactly:

- `invoke(channel, ...args)` → `ipcRenderer.invoke` (renderer→main request/response)
- `send(channel, ...args)` → `ipcRenderer.send` (fire-and-forget)
- `on(channel, handler)` → subscribe; **returns an unsubscribe function** and **strips the
  Electron `event`/`sender` arg** — renderer handlers receive `(...args)`, not `(event, ...args)`
- `getFilePath(file)` (via `webUtils.getPathForFile`) and `openExternal(url)` (via `shell.openExternal`)

Also exposed: `window.isPlaywright` (`process.env.PLAYWRIGHT === 'true'`).

Renderer code accesses this as `window.ipcRenderer` (e.g. `const { ipcRenderer } = window;` in
`bruno-app/src/providers/App/useIpcEvents.js`). **There is no channel allowlist** — any channel
string is forwarded. Do not rely on the preload to gate channels; validate inputs inside the
handler.

## Channel naming convention

Follow the prefix that matches the direction — the vast majority of handlers already do:

- **`renderer:*`** — renderer→main via `ipcMain.handle` (the default for new work; ~255 of ~290
  handlers). e.g. `renderer:ready`, `renderer:save-request`, `renderer:create-workspace`,
  `renderer:browse-directory`, `renderer:get-global-environments`.
- **`main:*`** — main→renderer push via `webContents.send`. e.g. `main:load-preferences`,
  `main:collection-opened`, `main:workspace-opened`, `main:collection-tree-updated`,
  `main:display-error`, `main:app-loaded`. A few `main:*` names are *internal* main-process
  events routed through `ipcMain.emit`/`ipcMain.on` (`main:renderer-ready`,
  `main:workspaces-ready`) — see the startup sequence.
- **Domain-namespaced invokes** for stateful sub-protocols: `grpc:*`, `renderer:ws:*` (WebSocket),
  `terminal:*`, `menu:*` (menu→main), `internal:*` (main-to-main only).
- **Legacy unprefixed network channels** — `send-http-request`, `cancel-http-request`,
  `fetch-gql-schema`, `clear-oauth2-cache`, `connections-changed`. These predate the convention;
  prefer a `renderer:*` name for new request-side channels rather than adding to this unprefixed set.

## Handler registration

All handlers are registered inside `app.on('ready')` in `index.js` (the `// register all ipc
handlers` block) by calling per-domain `register*Ipc(mainWindow, …)` functions, each `require`d
at the top of `index.js`. `registerPreferencesIpc` (which kicks off onboarding + the
`renderer:ready` handler) runs *before* `registerWorkspaceIpc` (which owns `main:renderer-ready`);
this is safe because `renderer:ready` only fires after the renderer mounts, by which point every
handler is registered. **A new IPC domain must add its own `register*Ipc` call here** — a handler
file that is never `require`d + called registers nothing.

## Where new handler code goes — keep it small and testable

**Don't let a handler file keep growing to where its size hurts readability and maintainability.**
When a group of handlers forms a separable feature, give it its own `ipc/<domain>.js` with its own
`register*Ipc` (wired into `index.js` as above) rather than appending to an existing large file —
separate it whenever it makes sense. Splitting by domain is already the norm here (`apiSpec.js`,
`workspace.js`, `mount.js`, …).

**Structure a handler so its callback is unit-testable.** Write the logic as a named, exported
function and let the thin `ipcMain.handle(channel, fn)` line just call it — not an inline anonymous
arrow, which can only be exercised through Electron. The exported callback can then be tested
without spinning up the main process: see `ipc/swagger-fetch.js` (`proxySwaggerFetch`) and the
specs under `ipc/network/` and `ipc/ai/`.

## Error-handling convention

Two patterns by handler type — match the one that fits:

- **CRUD / lifecycle handlers throw or reject.** Validation failures use bare
  `throw new Error(...)`; caught errors are re-surfaced with `return Promise.reject(error)` or
  `throw error`. The renderer `invoke` promise rejects and is shown via a `main:display-error`
  toast (`useIpcEvents.js`). A few read-only probes intentionally swallow and return a fallback
  (e.g. `exists-sync` → `false`, `get-collection-workspaces` → `[]`).
- **Request-execution handlers embed the error in the result.** `send-http-request`
  (`ipc/network/index.js`) does **not** reject on a failed request/script/test — it returns a
  result object carrying an `error` field so the renderer can render the failure as data. New
  network handlers follow this embed-in-result shape; new CRUD handlers throw/reject.

## Security constraints

`BrowserWindow` `webPreferences` (in `index.js`): `nodeIntegration: true`,
`contextIsolation: true`, `preload: preload.js`, `webviewTag: true`. **This `nodeIntegration:
true` + `contextIsolation: true` combination is intentional — do not "fix" it.** No `sandbox`
key (defaults off); `webSecurity` defaults on. A CSP is set via `electron-util`'s
`setContentSecurityPolicy` in `index.js` (`default-src 'self'`; `connect-src` adds PostHog;
`script-src 'self' data:`; `img-src` allows http/https/blob/data). `form-action 'none'` is
deliberately commented out to keep OAuth2 working. External navigation is hardened via
`will-redirect` + `setWindowOpenHandler`, which route http/https to `shell.openExternal` and deny
everything else — preserve this when touching window/navigation code.

## IPC startup sequence

```
renderer mounts
  -> useEffect: ipcRenderer.invoke('renderer:ready')    [useIpcEvents.js]
     -> main handles 'renderer:ready'                    [ipc/preferences.js]
          await onboardingPromise
          send main:load-preferences
          send main:load-global-environments (+ main:git-version, reopen last apispecs, ...)
          ipcMain.emit('main:renderer-ready')
            -> workspace.js listener:                     [ipc/workspace.js]
                 await ensureDefaultWorkspaceExists()
                 send main:workspace-opened (per workspace)
                 send + ipcMain.emit('main:workspaces-ready')
                   -> onboarding.js sends main:collection-opened  [app/onboarding.js]

did-finish-load (independent, from Chromium):                     [index.js]
  -> wraps webContents.send with a safeStringify/safeParse JSON roundtrip
  -> send main:app-loaded
     -> renderer sink sets data-app-state="loaded"        [pages/Bruno/index.js, NOT useIpcEvents.js]
```

## IPC race-condition pattern

When `ipcMain.emit` triggers multiple `ipcMain.on` listeners:
- Sync listeners complete fully before the next starts.
- Async listeners yield at the first `await`, letting the next listener start.
- `webContents.send` from earlier listeners can arrive at the renderer before messages from
  later async continuations.

Fix: chained events (`main:renderer-ready` → `main:workspaces-ready` → deferred
`main:collection-opened`) enforce ordering. Reuse this pattern rather than adding `setTimeout`s.

## Persistent stores (`src/store/`, electron-store)

Stores are electron-store JSON files under `app.getPath('userData')`, one module per file —
**read the directory for the current set** (it is large: preferences, cookies, oauth2,
collection-security, secrets, workspace/global environments, last-opened-*, window-state, …).
Gotcha: multiple modules can share the *same* JSON file. `lastOpenedCollections` lives in
`preferences.json` but is owned by `store/last-opened-collections.js` (a distinct
`new Store({ name: 'preferences' })` module), **not** by `store/preferences.js`. Don't assume a
store key belongs to the module named after the file.

## File watchers (`src/app/`)

Watchers live in `src/app/` — **read the directory for the current set** (`collection-watcher.js`,
`workspace-watcher.js`, `apiSpecsWatcher.js`, `dotenv-watcher.js`). Cleanup is
**not** uniform:
- `closeAllWatchers()` in `index.js` tears down exactly three —
  `collectionWatcher`, `workspaceWatcher`, `apiSpecWatcher` — each of which exposes
  its own `closeAllWatchers()`.
- `dotenv-watcher.js` is a shared singleton exposing `closeAll()` and is torn down transitively by
  the workspace watcher (and driven by the collection watcher), **not** from `index.js`.

When adding a watcher, decide which lifecycle it belongs to and register its cleanup in the
matching place — a top-level watcher goes into `closeAllWatchers()` in `index.js`; a
per-workspace/per-collection one hangs off the owning watcher.

## Onboarding flow

Entry: `src/app/onboarding.js` (`onboardUser`), invoked synchronously when `registerPreferencesIpc`
runs.

1. Checks `preferencesUtil.hasLaunchedBefore()`.
2. New users: imports the sample collection from `resources/data/sample-collection.json`.
3. Defers `main:collection-opened` (via a pending-collection var) until `main:workspaces-ready`.
4. `DISABLE_SAMPLE_COLLECTION_IMPORT === 'true'` skips the import (set in Playwright).

## Key environment variables

- `ELECTRON_USER_DATA_PATH` — custom userData path, **dev mode only** (`index.js:22`, guarded by `isDev`).
- `DISABLE_SAMPLE_COLLECTION_IMPORT` — skip sample collection on first launch.
- `PLAYWRIGHT` — signals the app is running under Playwright (read in `preload.js`, stores, etc.).
- `DISABLE_SINGLE_INSTANCE` — allow multiple app instances.

(All four are set to `'true'` for e2e in `playwright/index.ts`.)

## Before adding or changing an IPC handler — checklist

- [ ] Handler added in `src/ipc/<domain>.js` as `ipcMain.handle('renderer:<verb>', …)` (or the
      matching domain prefix); no new unprefixed channel.
- [ ] New handler lives in a focused `ipc/<domain>.js` — a separable feature gets its own file
      rather than bloating an existing one; its callback is a named exported function
      (unit-testable), not an inline arrow.
- [ ] If it's a new domain, its `register*Ipc(mainWindow, …)` is called in `index.js`'s ready block.
- [ ] Inputs validated inside the handler (the preload has no allowlist).
- [ ] Error path matches the handler type — CRUD throws/rejects; request-execution embeds `error`
      in the result.
- [ ] For a `main:*` push channel, the renderer adds a listener **and** an unsubscribe in
      `useIpcEvents.js`'s cleanup.
- [ ] Cross-process values survive the `did-finish-load` JSON roundtrip (no functions,
      class instances, or circular refs in payloads).
