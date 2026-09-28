---
paths:
  - "packages/**/*"
---

# Co-Related Features & Parity Surfaces

Bruno implements the same behaviour more than once — app vs CLI, `.bru` vs `.yml`, filestore vs
converters, implementation vs QuickJS shim. **A change to one side of a pair is not a finished
change**: the other side silently keeps the old behaviour and ships. The symptom is never a broken
build — it's a feature that works in the app but not in `bru run`, a field that survives save but
vanishes on export or migration, a `bru.*` method that is `undefined` in the default sandbox.

This rule maps *which* surfaces pair up. `.claude/rules/dsl-changes.md` owns the on-disk contract
in depth.

## When you work on a change

1. **Find the twin before writing the fix.** For every file you touch in the tables below, open
   its counterpart.
2. **Update the twin in the same change** when it's within what was asked.
3. **Otherwise, say so explicitly.** If the twin is out of scope, doesn't apply, or you're unsure,
   list it in your reply to the user (and in the PR description) with the path and why it was left
   — never leave a one-sided change unmentioned.
4. **Prefer unifying over copying.** If the logic has no Electron- or CLI-only dependency, move it
   into `@usebruno/requests` / `@usebruno/common` (respecting `.claude/rules/architecture.md`)
   instead of patching twice. Precedent: `utils/cookies.js` is one line in each runtime —
   `module.exports = require('@usebruno/requests').cookies;`. Where both copies must stay, note the
   pairing in a comment at both sites.

## 1. App ↔ CLI — highest priority

`bruno-cli` is how collections run in CI. Several pipeline modules are **copied, not shared**, and
a bug fixed in the app is still present in `bru run` until its twin is fixed. Trace app-reported
bugs to the shared logic, not the reporting surface.

| Concern | `bruno-electron/src/…` | `bruno-cli/src/…` |
|---|---|---|
| Request execution — pre/post scripts, vars, asserts, tests, runner flow (`setNextRequest`, `skipRequest`) | `ipc/network/index.js` | `runner/run-single-request.js`, `commands/run.js` |
| Request assembly | `ipc/network/prepare-request.js` | `runner/prepare-request.js` |
| HTTP client, TLS, certs | `ipc/network/axios-instance.js` | `utils/axios-instance.js` |
| Interpolation | `ipc/network/interpolate-{vars,string}.js` | `runner/interpolate-{vars,string}.js` |
| Collection tree, `merge{Headers,Scripts,Vars,Auth}` | `utils/collection.js` | `utils/collection.js` |
| Collection loading, `bruno.json` / `opencollection.yml` config | `utils/collection-reader.js`, `app/collection-watcher.js` | `utils/collection.js` (`getCollectionConfig`) |
| Environments & persisted vars | `utils/environments.js` | `utils/environment.js`, `utils/persist-variables.js` |
| Proxy · OAuth 2.0 · form-data · filesystem | `utils/{proxy-util,oauth2,form-data,filesystem}.js` | `utils/{proxy-util,oauth2,form-data,filesystem}.js` |
| AWS SigV4 | `ipc/network/awsv4auth-helper.js` | `runner/awsv4auth-helper.js` |

- A new app runner option (tags, delay, bail) needs a `bru run` flag, or a stated reason.
- Import: the app imports Postman, Insomnia, OpenAPI, WSDL and OpenCollection; `bru import`
  (`commands/import.js`) only OpenAPI and WSDL. Changes to a shared converter affect both.
- **Known-divergent by design.** The CLI has no preferences store (so no `resolveInheritedSettings`),
  no Electron window, no system-browser OAuth, and no `@usebruno/schema` validation. Its runner
  handles only `REQUEST_ITEM_TYPES = ['http-request', 'graphql-request']`
  (`bruno-cli/src/utils/collection.js`).

## 2. Persisted fields — every layer that carries a field list

A field is added in one place and read in many. Each of these keeps its **own** list, aligned by
hand:

| Layer | Where | Missed → |
|---|---|---|
| Types | `bruno-schema-types/src/collection/item.ts` | type drift |
| Yup schema | `bruno-schema/src/collections/index.js` — `.noUnknown(true).strict()` | **throws on save** |
| App save transform | `bruno-app/src/utils/collections/index.js` — `transformRequestToSaveToFilesystem`, `transform{Collection,Folder}RootToSave`, `transformCollectionToSaveToExportAsFile` | dropped before reaching disk / Bruno JSON export |
| On-disk formats | `bruno-filestore/src/formats/{bru,yml}` (+ `bruno-lang`) — parse **and** stringify | lost in one format |
| BRU → YML migration | `bruno-electron/src/ipc/yml-migration.js` (bru parse → yml stringify) | lost when a user migrates |
| Collection config | `bruno.json` ↔ `opencollection.yml` — `utils/transformBrunoConfig.js`, `stringifyCollection`, migration's config transform (e.g. `transformProxyConfig`), CLI `getCollectionConfig` | config lost or misread by CLI |
| OpenCollection import/export | `bruno-converters/src/opencollection/items/{http,graphql,grpc,websocket}.ts`, `folder.ts`, `environment.ts` — **both** directions; app entry `bruno-app/src/utils/exporters/opencollection.js` | lost on export or import |
| Other converters | `postman/{postman-to-bruno,bruno-to-postman}.js`, `insomnia/`, `openapi/`, `wsdl/`; app exporters `postman-collection.js`, `openapi-spec.js`, `bruno-environment.js` | lost on import/export where the target can represent it |

The migration also rewrites content, not just shape: `bru.runRequest("x.bru")` paths are stripped
of `.bru`, and tab snapshots are remapped. A new script API that takes a file path, a new file
type, or a new `bruno.json` key needs a matching migration step.

## 3. Scripting API ↔ QuickJS shim

`bruno-js/src/{bru,bruno-request,bruno-response}.js` implement the API. The **QuickJS sandbox — the
default "safe" mode — bridges each method explicitly** in `bruno-js/src/sandbox/quickjs/shims/`
(`bru.js`, `bruno-request.js`, `bruno-response.js`, `bruno-grpc.js`, …). Implementation only →
works in developer mode, `undefined` for most users.

## 4. Scope levels — collection ↔ folder ↔ request

Auth, headers, vars, scripts and tests exist at three levels plus `inherit`. Each level has its own
UI (`CollectionSettings/`, `FolderSettings/`, `RequestPane/`), and resolution lives in the merge
helpers in **each** runtime's `utils/collection.js`. A feature at one level needs a stated decision
for the other two and for `inherit`.

## 5. Protocols — HTTP ↔ GraphQL ↔ gRPC ↔ WebSocket

`REQUEST_TYPES` (`bruno-app/src/utils/common/constants.js`, `bruno-electron/src/utils/constants.js`)
lists all four. Each has its own `parse*`/`stringify*` in `bruno-filestore/src/formats/yml/items/`
and its own converter in `bruno-converters/src/opencollection/items/`. "HTTP only" is a legitimate
scope — leaving it unstated is how a gap becomes a bug report. Widening CLI protocol support is a
deliberate decision, not an incidental one.

## 6. Request shaping ↔ code generation

`GenerateCodeItem/utils/snippet-generator.js` consumes headers, body, `settings` and resolved auth.
A new auth mode or a setting that changes the wire request should change the generated snippet.

## Parity checklist

- [ ] Every twin in §1 opened; updated, or listed to the user with a reason
- [ ] App-reported bug fixes verified on the CLI path
- [ ] Shared logic moved to a leaf package where the DAG allows, instead of patched twice
- [ ] Persisted field carried through every layer in §2 — including migration and converters (both directions)
- [ ] New/changed `bru.*`, `req.*`, `res.*` API bridged in the QuickJS shim
- [ ] Collection / folder / request levels and `inherit` each decided
- [ ] gRPC and WebSocket considered; any "HTTP only" scope stated
- [ ] Code generation updated if the wire request changed
- [ ] Tests on **both** sides of every pair touched

Human-facing version of this map (for QA): Confluence *Related Feature Map — Change Impact &
Parity Checklist*, https://usebruno.atlassian.net/wiki/spaces/Bruno/pages/1376944136. Keep the two
in step: add new pairings to both, and remove unified ones from both.
