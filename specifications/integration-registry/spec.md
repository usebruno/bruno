### Integrations Specification

**TL;DR:** Add a modular, toggleable **Integrations** system so each integration (e.g., Github Search) ships as its own package, registers UI elements (search providers, sidebar panels, menu items) via an integrations registry, and is enabled per-user via a new `integrations` preference. This spec defines requirements, API, file changes, tests, docs, migration, and an implementation roadmap.

---

## 1. Goals & Non‑Goals 🎯

**Goals**
- Allow integrations to register UI pieces (Search providers, Sidebar panels, menu entries) that are available only when the integration is enabled.
- Keep integrations **self-contained** (packaged library) and **hot-enableable** (no restart if possible).
- Provide a small, stable **Integration API** and a central **registry**.
- Provide a user-facing **Preferences → Integrations** UI to enable/disable integrations.

**Non‑Goals**
- A plugin marketplace or 3rd‑party signing/auth model (out of scope for initial work).
- Complex dynamic sandboxes for untrusted code (defer to later).

---

## 2. Requirements (Functional / UX / Security) ✅

- Prefs: store per-integration enabled state at `preferences.integrations.<id>.enabled`.
- Registry: allow `register`, `unregister`, `enable`, `disable`, and query enabled integrations.
- UI: an `Integrations` Preferences tab listing integrations with toggles, description, and a link to docs.
- Sidebar: an `Integrations` section that renders integration-provided components when enabled.
- Global Search: allow integrations to add search providers that appear in global search results.
- Lifecycle: `init(context)` on enable, `dispose()` on disable.
- Security: integrations must only access app surface provided via `context` (no arbitrary privileged globals).
- Tests: unit + integration tests for toggles, registry lifecycle, and UI wiring.

---

## 3. High-level Design & Components 🔧

- **Preferences Store**: add `integrations` object. Helpers: `getIntegrationPref(id)`, `setIntegrationEnabled(id, bool)`.
- **Integrations Registry**: central module in renderer `integrations/registry` with public API: `register(metadata)`, `enable(id)`, `disable(id)`, `getEnabled()`, `initWithPreferences(obj)`.
- **Renderer Integration Loader**: on app startup or prefs change, initialize enabled integrations.
- **UI Hooks**:
  - `GlobalSearch` accepts providers from registry.
  - `Sidebar` renders registered `SidebarComponent`s for enabled integrations.
  - `Preferences` gains an `Integrations` tab to toggle integrations.
- **Package Layout**: each integration can be a package `packages/bruno-integration-<name>` that exports a `register` function for the registry.

---

## 4. Suggested Integration Interface (no code blocks — descriptive) ✨

Integration registration object (fields and behavior):
- `id` (string): unique id, e.g., `github`.
- `label` (string): human friendly name.
- `icon` (React element or icon ref): for Preferences/listing.
- `init(context)`: async function called when integration is enabled. Receives `context` with APIs (e.g., `openTab`, `ipc`, `registerSearchProvider`, `logger`).
- `dispose()`: async cleanup function called on disable.
- Optional providers:
  - `getSearchProvider()` returns object `{ id, label, search(query) -> Promise<results> }`.
  - `SidebarComponent` (React component) rendered in integrations section.
  - `menuItems()` returns menu entries to add to existing menus.

Design notes:
- Keep `init`/`dispose` semantics consistent across integrations.
- Allow integrations to register multiple provider types during `init`, and registry should return tear-down handles.

---

## 5. Preferences schema / shape 🔐

- Add to global preferences store: `integrations: { [id: string]: { enabled: boolean, config?: Record<string,any> } }`.
- Default: `{}`.
- Shallow validation: only `enabled` is required for initial rollout.
- Provide migration helpers if older settings exist.

---

## 6. File Changes (candidate list with reasons) 📁

- `packages/bruno-app/src/main/preferences/*` — update preferences store to add `integrations` default and helpers (persistence).
- `packages/bruno-app/src/components/preferences/PreferencesTabs*` — add `Integrations` tab.
- `packages/bruno-app/src/components/preferences/IntegrationsList*` — new component to list known integrations and toggles.
- `packages/bruno-app/src/integrations/registry/index.*` — new registry module (core logic).
- `packages/bruno-app/src/components/global-search/*` — accept external providers; add registration/unregistration hooks.
- `packages/bruno-app/src/components/sidebar/SidebarRoot*` — add `IntegrationsSection` slot and render components from registry.
- `packages/bruno-app/src/app/init*` — wire registry initialization and listeners for preference changes.
- `packages/bruno-app/src/integrations/samples/github/` — sample integration to demonstrate end-to-end.
- `packages/bruno-app/test/*` and `tests/playwright/*` — tests covering toggling and UI appearance.
- `docs/developer/integrations.md` — new developer guide.

(Each file change should include small, focused edits; prefer adding new modules over big rewrites.)

---

## 7. Tests & Docs 📚

Tests:
- Unit tests for registry: register/unregister, enable/disable calls, and provider registration lifecycle.
- Unit tests for preferences helpers: persistence and defaulting.
- UI tests (component-level): `Integrations` tab toggle changes preferences.
- Playwright E2E: enable sample GitHub integration, assert Sidebar component appears, and Search returns sample provider results.

Docs:
- `docs/developer/integrations.md` with:
  - How to create an integration package.
  - API description (init, dispose, providers).
  - Example: `bruno-integration-github` structure and minimal `init` flow.
  - Notes about auth flow and use of `context.ipc`.

---

## 8. Migration & Backwards Compatibility 🔄

- If no prior `integrations` key exists, default to `{}` and no integration enabled.
- If we later add built-in integrations, set them to disabled by default and provide a first-run prompt to enable.
- Keep preference keys backward-compatible; write a migration script if earlier work used different keys.

---

## 9. Milestones & Tasks (executable list) 🛠️

1. **Spec & Registry skeleton** — Add `integrations` pref + registry module + test skeleton. (Files: `preferences`, `integrations/registry`) — 1 day.
2. **Integrations Preferences UI** — Build `Integrations` tab and hook toggles to preferences. (Files: `PreferencesTabs`, `IntegrationsList`) — 1 day.
3. **Hook UI slots** — Add `IntegrationsSection` to Sidebar and allow GlobalSearch providers. — 1 day.
4. **Sample integration** — Add sample `github` integration that registers a search provider and a sidebar component. — 1–2 days.
5. **Tests & Playwright** — Add E2E tests for enable flow. — 1 day.
6. **Docs, polish, and PR** — Developer docs, changelog, and cleanup. — 0.5–1 day.

Acceptance criteria:
- Enabling an integration persists in preferences.
- Enabled integration's Sidebar component appears without app restart.
- Global Search shows results from enabled integration's provider.
- Disabling removes UI and unregisters providers.

---

## 10. Risks & Mitigations ⚠️

- Risk: integrations cause renderer crashes. Mitigation: restrict exposed `context` API and add try/catch isolation around `init`/`dispose`.
- Risk: performance when many enabled providers. Mitigation: lazy-load components and debounce provider queries; scale later.
- Risk: migration complexity. Mitigation: keep initial schema minimal and add migrations only when necessary.

---

## 11. Next Steps ✅

1. Finalize this spec (feedback loop).  
2. Implement milestone 1: add pref key and registry skeleton; include unit tests. (I can draft a PR for this.)  
3. Implement UI + sample integration and E2E tests in subsequent PRs.

---

> Note: Implementation detail decisions to confirm — prefer **monorepo packages** for integrations initially (simpler dev flow) and hot-loading support for best UX. Choose dynamic import vs static registration before sample integration.