---
paths:
  - "packages/bruno-app/**/*"
---

# React / Redux Architecture

## Store configuration

`configureStore` (Redux Toolkit **v1.8**, not v2) is set up in
`src/providers/ReduxStore/index.js`. That file's `reducer` map is the **authoritative slice list**
(~11 keys); read it rather than trusting any list here. Middleware is
`getDefaultMiddleware().concat([...])` with **no options passed**, so RTK's defaults —
`thunk`, plus `serializableCheck` and `immutableCheck` in dev — are all active.

**Consequences to respect:**
- **State must stay serializable.** Don't put functions, class instances, Promises, or DOM nodes
  in the store — dev `serializableCheck` will flag them. Do **not** disable `serializableCheck` in
  the real store to work around it (the only place it's disabled is a middleware unit test).
- **Reducers mutate the Immer draft directly.** `createSlice` reducers write
  `state.collections.push(...)`, `item.name = ...`, `.splice(...)` — do **not** spread-clone or
  return new objects unless replacing wholesale. Match the surrounding reducer.

## Slice organization

Slices live in `src/providers/ReduxStore/slices/`, one domain each; `collections/` is by far the
largest (collection tree, requests, environments, runner, drafts — ~200 reducer action creators in
`collections/index.js`, plus ~150 thunks in `collections/actions.js`, and more spread in from
`collections/exampleReducers.js`). Read the specific slice for its real state and actions.

Two gotchas:
- **Reducer key ≠ folder/file name.** e.g. `globalEnvironments` comes from
  `slices/global-environments.js`; `openapiSync` from `slices/openapi-sync.js`.
- **Action-type prefix follows the slice's `name:`, not the reducer key.** e.g.
  `global-environments/…`, `collections/…`, `app/…`. Grep the action type, not the key, when
  tracing dispatches.

## Actions / thunks convention

Async logic is written as plain hand-written thunks — a function that returns
`(dispatch, getState) => …`. `createAsyncThunk` isn't used anywhere today:

```javascript
export const saveRequest = (itemUid, collectionUid) => (dispatch, getState) => { ... };
// or async
export const openCollectionEvent = (uid, pathname, ...) => async (dispatch, getState) => { ... };
```

Thunks live in the slice's `actions.js` (`slices/collections/actions.js` is the big one:
`sendRequest`, `saveRequest`, `importCollection`, `pasteItem`, `deleteItem`, `openCollectionEvent`
— the last handles the `main:collection-opened` IPC). Reducers (in the slice's `index.js`) stay
synchronous. Follow the plain-thunk shape by default so new code matches the rest — but this is a
convention, not a blocker: if a feature genuinely benefits from `createAsyncThunk` (e.g. its
built-in pending/fulfilled/rejected states), it's fine to reach for it deliberately.

## Side-effect boundaries

- **Reducers are pure** — no IPC, no network, no `Date.now`/random, no async. Immer draft
  mutations only.
- **Side effects live in thunks and middleware.** IPC is invoked from thunks via
  `window.ipcRenderer` (e.g. `saveRequest` → `ipcRenderer.invoke('renderer:save-request', …)`); the
  `collections/actions.js` file alone has ~200 `ipcRenderer` calls.
- **The file-IO → open-tab pattern** is split across a thunk and the `tasks` middleware: a thunk
  queues an `OPEN_REQUEST`/`OPEN_EXAMPLE` task (`insertTaskIntoQueue`) and fires the IPC write; the
  `tasks` middleware watches for the resulting `main:*` file event, then dispatches `addTab` +
  `removeTaskFromQueue`. Reuse this queue rather than opening the tab optimistically.

## Custom middleware (`middlewares/`)

Five middlewares, registered in `index.js` (read the directory + registration array for the live
set):
- **`tasks`** — listener middleware; opens a request/example tab after the file event for a queued
  task arrives (see file-IO pattern above).
- **`draft`** — on the first edit action, promotes a *preview* tab to permanent
  (`handleMakeTabParmanent`). It does **not** write draft state — the reducers do.
- **`autosave`** — debounced by `preferences.autoSave.interval`, gated on
  `app.preferences.autoSave.enabled`; dispatches the `save*` thunks.
- **`snapshot`** — debounced (~1s), gated on `app.snapshotReady`; persists a curated state subset
  to disk (see Persistence).
- **`debug`** (dev only) — logs every action; added only when `import.meta.env.MODE ===
  'development'`.

## Persistence / serialization constraints

The store isn't persisted wholesale, and there's no `redux-persist`. Instead the `snapshot`
middleware serializes a **curated subset** — workspaces, collection metadata, per-collection tabs,
selected environments, and devtools console open-state (`extras.devTools`, from the `logs` slice;
see `middlewares/snapshot/serializeSnapshot.js`) — and writes it to disk via IPC. Request/response
bodies are deliberately not persisted. To persist a new piece of state, extend `serializeSnapshot`
and its save-trigger list (`utils/snapshot`) — the snapshot is the established mechanism, so prefer
it over adding `redux-persist` or `localStorage`.

## Selectors

Inline `useSelector` in components is the norm (hundreds of usages); memoized `createSelector` is
used in just one place (`src/selectors/tab.js`). Default to inline
`useSelector`, and reach for `createSelector` when a derivation is genuinely expensive or reused.

## What belongs in Redux (and what doesn't)

- **In Redux:** draft / unsaved state (`item.draft`, `collection.draft`, `environmentsDraft`,
  `globalEnvironmentDraft`), and cross-component or persisted UI state (`sidebarCollapsed`,
  `leftSidebarWidth`, `taskQueue`, `item.collapsed`, active tab).
- **Local `useState`:** ephemeral, component-scoped UI — search text, inline-create toggles, hover,
  transient form state. Don't lift these into a slice.

## Sidebar collection visibility

Collections render in the sidebar only when they belong to the **active workspace**.
`Sidebar/Collections/index.js` builds the list in a `useMemo` that walks
`activeWorkspace.collections`, matches loaded collections through a `Map` keyed on
`normalizePath(pathname)`, **excludes scratch collections** (`isScratchCollection`), adds "ghost"
git-remote rows (`GitRemoteCollectionRow`) for non-default workspaces, and sorts alphabetically.
Read the current `useMemo` before changing this. Collapsed folders do **not** render their children
in the DOM (conditional render on `item.collapsed`).

## Sidebar DOM structure (for Playwright)

`.collection-item-name` is the class on the **row-wrapper** div for every item (folders, requests,
JS files) in `Sidebar/Collections/Collection/CollectionItem/index.js` — the wrapper also contains
the name span and `.menu-icon`. Use it for Playwright locators.

## Providers (`src/providers/`)

Read the directory for the current set: `App/` (IPC listeners in `useIpcEvents.js`, app init),
`ReduxStore/`, `Theme/`, `Hotkeys/`, `Toaster/`, `PromptVariables/`.

## Checks after changing a slice / middleware

Slices and middleware have Jest coverage under `src/providers/ReduxStore/` (e.g.
`slices/collections/*.spec.js`, `slices/global-environments.spec.js`,
`middlewares/snapshot/serializeSnapshot.spec.js`). After a change, run the relevant spec:

```bash
npm test --workspace=packages/bruno-app -- <path-or-pattern>
```

If you touch the reducer map, thunks that fire IPC, or the snapshot subset, also sanity-check that
state stays serializable (no dev `serializableCheck` warnings) and that persisted shape still
round-trips through `serializeSnapshot`.
