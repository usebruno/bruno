# PRD: User-Configurable Chai Plugins for Bruno

> **Status:** Draft · **Owner:** TBD · **Last updated:** 2026-06-16

## Context

Today Bruno bundles a single chai plugin (`chai-string`) and registers a handful of custom assertions (`jsonSchema`, `json`, `match`, `jsonBody`) inline in `packages/bruno-js/src/runtime/assert-runtime.js`. Every additional assertion capability — `chai-subset`, `chai-as-promised`, `chai-http`, `chai-json-schema`, `chai-like`, `chai-datetime` — requires the Bruno maintainers to add the dependency, ship a release, and accept ongoing maintenance burden. There is an open community ask for more plugins, and the queue is unbounded: <https://www.chaijs.com/api/plugins/>.

The opportunity is to **flip the model**: instead of Bruno curating a closed list, let users configure their own chai plugins per collection. Plugin definitions live in `bruno.json` (the collection manifest) so they're git-committed, team-shareable, and reviewable in PRs — true to Bruno's offline-first, filesystem-first ethos.

The intended outcome:

- Maintainers stop being a bottleneck for assertion-library extensibility.
- Users get parity with Postman/Jest test ecosystems on day one.
- Bruno positions itself as the *open and extensible* API client — a differentiator vs. closed competitors.
- The mechanism generalizes (in a later release) to "Sandbox Init Scripts" for `dayjs.extend`, lodash mixins, custom helpers, etc.

---

## 1. Problem Statement

**User pain:** "I want to use `expect(response.body).to.containSubset({...})` but `chai-subset` isn't bundled, and there's no way for me to add it."

**Maintainer pain:** Every chai plugin request becomes a PR + release + dependency to maintain forever. The cost compounds.

**Strategic pain:** Bruno's value prop ("everything in your repo, no cloud") is undercut every time a user has to file an upstream issue for a one-line `chai.use(...)` call.

---

## 2. Goals & Non-Goals

### Goals (v1)

- Users can define chai plugins **per collection** via a dedicated UI panel.
- Plugins persist in `bruno.json`, surfacing in git diffs alongside the collection.
- Plugins load automatically in both QuickJS (default) and Node VM sandboxes.
- A small **curated catalog** of paste-ready plugin snippets ships in-app, covering the top ~6 community plugins.
- Three of those plugins (chai-subset, chai-as-promised, chai-json-schema) are **pre-bundled** so they work in QuickJS without any `require()` of npm packages.
- Plugin init errors are attributed to a named plugin and surfaced in the test results panel — they do not silently fail and do not block unrelated tests.

### Non-Goals (v1)

- Workspace-level or app-global plugins. Collection-only.
- A community plugin marketplace, ratings, signing, or auto-update.
- Auto-running `npm install` from within Bruno.
- Plugins for `pre-request` scripts (separate scope, separate UX surface).
- Hot reload of plugin code without re-running the request (the sandbox is recreated per run, so this is free anyway — but no special "Reload" button).
- Auto-switching a collection's sandbox runtime on the user's behalf.

---

## 3. Strategic Framing

Internally, build the **generic primitive: "Pre-Test Init Script"** — arbitrary JS that runs once per sandbox lifecycle, before user test scripts, in the same realm. Chai plugins are the headline use case.

Externally in v1, surface this only as a **"Chai Plugins"** panel. Reserve the right to expose a raw "Init Script" tab in v2 once the primitive is battle-tested. The plumbing cost is identical to a chai-specific implementation, but the naming and storage are generic, so we don't need a migration to unlock future use cases (lodash mixins, dayjs extensions, custom matchers).

This is the single most important architectural decision in the PRD.

---

## 4. User Stories

1. **As a backend engineer testing a JSON API**, I want to write `expect(body).to.containSubset({...})` so I can assert partial shapes without writing nested `expect(body.x).to.equal(...)` chains. I paste the chai-subset snippet from Bruno's catalog and it works in the default runtime.
2. **As a team lead**, I want my teammates to inherit our shared test assertions when they clone the repo, without a separate setup step. Plugin definitions land in `bruno.json`, so `git pull` is the install.
3. **As a power user**, I want to write a custom chai plugin (an in-house DSL: `expect(x).to.beValidOrgId()`) once and reuse it across every test in the collection. I author the plugin inline; no npm package required.
4. **As a CI/CD operator**, I want `bru run` (the CLI) to honor the same plugins as the desktop app so my local-passing tests pass in CI.

---

## 5. UX

### 5.1 Where it lives

A new tab **"Plugins"** in **Collection Settings → Scripting** (sibling to the existing pre-request/test script panels). Collection-level only in v1.

### 5.2 Anatomy of the panel

- **Header row:** "Chai Plugins · Extend the assertion library used by your test scripts. [Learn more →]"
- **Catalog strip** (collapsible): horizontal scroll of catalog cards. Each card has:
  - Plugin name (e.g. `chai-subset`)
  - One-line description
  - Runtime compatibility badge: `Bundled` (green, works everywhere with no setup), `Pure JS — Both runtimes` (blue), or `Node VM only` (yellow)
  - "Add to collection" button → inserts a named entry pre-populated with the snippet
- **Plugin list:** named entries the user has added. Each row:
  - Editable name field
  - Code editor (CodeMirror, monospace, JS syntax highlighting) for the plugin body
  - Enable/disable toggle
  - Delete button
  - "Move up / move down" handles (order matters — see §7)
- **Empty state:** large catalog strip plus a "Or write your own" button that adds an empty entry.

### 5.3 Plugin code shape

The user pastes a snippet that calls `chai.use(...)`. Examples:

```js
// Bundled — works in QuickJS and Node VM
chai.use(require('chai-subset'));
```

```js
// Pure JS plugin — works in both runtimes
chai.use(function (chai, utils) {
  chai.Assertion.addMethod('beValidOrgId', function () {
    new chai.Assertion(this._obj).to.match(/^org_[a-z0-9]{12}$/);
  });
});
```

```js
// Node VM only — requires user-installed npm package
chai.use(require('chai-http'));
```

### 5.4 Error surfacing

- **Catalog snippets are pre-validated**, so the happy path is silent.
- **Plugin init exceptions** surface as a synthetic top-of-results section: `Plugin init failed: 'chai-subset' — TypeError: ...`. Subsequent plugins still load. Test scripts still run; assertions that depended on the failed plugin fail in the normal results panel with the plugin's missing methods.
- **Hard-fail with attribution.** Silent-skip is rejected: users will spend hours debugging "why is `containSubset` undefined."
- **Catalog cards declare runtime compatibility.** A `Node VM only` snippet pasted into a QuickJS collection produces a typed error: `BrunoSandboxError: Plugin 'chai-http' requires the Node VM runtime. Switch this collection's JS sandbox under Collection Settings → Scripting → Runtime.`

### 5.5 Catalog (v1 contents)

Ship six entries:

| Plugin | Runtime | Source |
| --- | --- | --- |
| chai-subset | Bundled | pre-bundled npm |
| chai-as-promised | Bundled | pre-bundled npm |
| chai-json-schema | Bundled | pre-bundled npm |
| chai-http | Node VM only | `require('chai-http')` |
| chai-like | Pure JS · Both | inline snippet |
| chai-datetime | Node VM only | `require('chai-datetime')` |

The catalog is static UI data; no runtime npm lookup. It can be expanded by a docs/PR contribution without touching the bundle.

### 5.6 First-open security prompt

When a collection with a non-empty plugin list is opened for the first time on this machine, show a non-blocking banner: "This collection defines test-setup scripts. Review them before running." Linked to the Plugins panel. Suppressed by a "Don't show again for this collection" checkbox.

---

## 6. Tech Feasibility

### 6.1 Storage

- New field in `bruno.json` under the existing `scripts` block:

  ```json
  {
    "scripts": {
      "preTestPlugins": [
        { "name": "chai-subset", "enabled": true, "code": "chai.use(require('chai-subset'));" },
        { "name": "myCustomMatcher", "enabled": true, "code": "chai.use(function(chai){ /* ... */ });" }
      ]
    }
  }
  ```

- Internal field name `preTestPlugins` (generic, future-proof) — UI surfaces it as "Chai Plugins".
- No new file on disk in v1. (v2 may support `{ "from": "./bruno-plugins/" }` for large plugin sets.)
- Git diffs surface plugin changes during code review — this is a *security feature*, not just organizational.

### 6.2 Wiring through the sandbox

**Critical files:**

- `packages/bruno-js/src/runtime/test-runtime.js` — `TestRuntime.runTests()` already receives `scriptingConfig`. Pass the parsed `preTestPlugins` array into both sandbox entry points.
- `packages/bruno-js/src/sandbox/quickjs/index.js` — splice plugin evaluation *after* `addLibraryShimsToContext(vm)` and `getRequireCode()`, *before* `wrapScriptInClosure(externalScript, ...)`. Each named plugin gets its own `vm.evalCode(pluginCode)` call wrapped in a try/catch so errors are attributable. Approximate injection point: lines 123–127.
- `packages/bruno-js/src/sandbox/node-vm/index.js` — compile each enabled plugin's code as a separate `vm.Script` and execute against the same `isolatedContext` *after* `scriptContext.require` is wired (around line 67) and *before* the user script runs (around line 112).
- `packages/bruno-js/src/sandbox/bundle-libraries.js` — extend the Rollup bundle to include `chai-subset`, `chai-as-promised`, `chai-json-schema`. Expose under `globalThis.requireObject['chai-subset']` etc. so the QuickJS `require()` shim resolves them.
- `packages/bruno-electron/src/ipc/network/index.js` — `scriptingConfig` is already threaded through (~line 883). Confirm `preTestPlugins` rides along; no new IPC channels required.
- `packages/bruno-app/src/components/CollectionSettings/Script/` — add a new `Plugins/` sibling component, modeled on the existing pre-request/test script tabs. Reuse the CodeMirror wrapper.
- `packages/bruno-app/src/providers/ReduxStore/slices/collections/` — extend the collection-root save action to persist `scripts.preTestPlugins`.
- `packages/bruno-cli/src/runner/` — the CLI uses the same `bruno-js` runtimes, so plugin loading is inherited transparently. Verify no separate `scriptingConfig` plumbing is missed in the CLI path.

### 6.3 QuickJS pre-bundled plugin set (v1)

Three plugins, no more:

- **chai-subset** — most-requested community plugin.
- **chai-as-promised** — Bruno has no first-class promise assertions today.
- **chai-json-schema** — Bruno already has a half-baked custom `jsonSchema` assertion in `assert-runtime.js:38`, so most of the integration work is done; consolidating onto the upstream plugin reduces drift.

These are added to `bundle-libraries.js` and exposed via `globalThis.requireObject`.

### 6.4 No new IPC

`bruno.json` is already read by Electron main and synced to the renderer via existing `collection:update` events. The renderer-side panel writes back through the same paths used by other CollectionSettings tabs.

---

## 7. Risks & Open Questions

1. **Chai version pinning.** Bruno currently uses chai 4.3.7. Plugins authored against chai v5 may break. The PRD commits to (a) documenting the bundled chai version prominently in the Plugins panel header, (b) treating a chai major bump as a collection-breaking change, not an internal refactor.
2. **Plugin execution order is observable.** `chai.use(A); chai.use(B)` and the reverse can differ when both override the same property. Order is top-to-bottom in the UI list, persisted as array order in `bruno.json`. State this explicitly in docs.
3. **Security — code execution on collection open.** Today, a malicious collection from GitHub can only execute code when the user runs a request. With plugins, any pasted code runs *before* any test, the moment the user runs *any* request. This is roughly the same trust model as pre-request scripts, but the surface widens. Mitigation: the first-open security banner (§5.6) and the fact that diffs of `bruno.json` surface in PRs.
4. **Error containment.** If plugin #2 throws during init, plugins #3+ still load; each error is reported individually. No cascade.
5. **Performance / bundle size.** Adding three plugins to the QuickJS bundle adds ~30–80 KB to `bundle-browser-rollup.js`. Acceptable. Soft-warn (no hard cap) at >10 user plugins or >50 KB of plugin code.

---

## 8. Success Metrics

Track for 90 days post-launch:

1. **Adoption.** % of collections (via opt-in telemetry, or via public-repo sampling of `bruno.json` files on GitHub) that define ≥1 plugin. **Target: 5% within 90 days.**
2. **Catalog conversion.** Of users who open the Plugins panel, what % use a catalog snippet vs. write from scratch. High catalog usage validates the curated-examples investment; low usage signals users want only raw flexibility (and the catalog UI is dead weight).
3. **Plugin-related GitHub issue volume.** Issues with label `area:plugins` after launch month. **Target: ≤5 sustained/month.** Spikes signal docs/UX problems.
4. **Reduction in plugin-specific feature requests.** Count of new issues opened requesting specific chai plugins (`chai-as-promised`, `chai-subset`, etc.) in the 6 months *after* launch vs. the 6 months *before*. **Target: 80% reduction** — users self-serving.

---

## 9. Phased Rollout

- **v1 (this PRD):** Collection-level plugins, catalog with 6 entries, 3 pre-bundled, security banner, error attribution. Ships as a feature-flag-free release once internal dogfooding passes.
- **v1.1:** Documentation site additions; YouTube/blog walkthrough; community plugin contribution guide for adding to the catalog.
- **v2 (future, not in this PRD):**
  - Surface the underlying primitive as a generic "Pre-Test Init Script" panel — unblocks `dayjs.extend`, lodash mixins.
  - External plugin files (`scripts.plugins.from: "./bruno-plugins/"`).
  - Workspace-level plugins.
  - Community plugin registry / share-with-team flow.

---

## 10. Verification

End-to-end test plan to validate before merging:

1. **Unit tests** for `bruno-js` plugin loader: assert that valid plugins register methods on `chai.Assertion`, that invalid plugins throw attributable errors, that disabled plugins are skipped, and that order is preserved. Files to add tests under: `packages/bruno-js/tests/`.
2. **Sandbox integration tests** for both runtimes:
   - QuickJS: paste a snippet using `chai-subset`; confirm `expect({a:1, b:2}).to.containSubset({a:1})` passes.
   - QuickJS: paste a snippet using `chai.use(require('chai-http'))`; confirm typed `BrunoSandboxError` is raised with the "needs Node VM" hint.
   - Node VM: install `chai-http` in collection `node_modules/`, paste the snippet, confirm `.request` works.
3. **CLI parity:** run `bru run` against a collection with plugins; assert same behavior as desktop.
4. **`bruno.json` round-trip:** define plugins in UI → save → reopen Bruno → confirm plugins reload from disk unchanged.
5. **Manual desktop test:** open Collection Settings → Scripting → Plugins; add `chai-subset` from catalog; write a test using `containSubset`; run the request; assert passes. Toggle the plugin off; rerun; assert the test fails with `containSubset is not a function`.
6. **Security banner:** clone a collection with plugins from a fresh path; confirm the first-open banner appears.

Build / test commands (from existing CLAUDE.md):

- `npm run build:bruno-common && npm run sandbox:bundle-libraries --workspace=packages/bruno-js`
- `npm run test --workspace=packages/bruno-js`
- `npm run test --workspace=packages/bruno-electron`
- `npm run dev:web` + `npm run dev:electron` for manual testing.
