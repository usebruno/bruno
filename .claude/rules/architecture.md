---
paths:
  - "packages/**/*"
---

# Dependency Boundaries

Internal `@usebruno/*` dependencies (from each `package.json`) form a strict DAG. **New code must
respect it** — a cyclic or upward dependency is an architectural bug, not a convenience.

The full monorepo map (build tools, request pipeline, sandbox, file formats, core data-model
types, dependency versions) is the on-demand reference `.claude/reference/architecture.md` — read
it before non-trivial cross-package or architectural work.

## Dependency direction & ownership boundaries

- **Leaf libs — zero internal `@usebruno/*` deps:** bruno-common, bruno-lang, bruno-query,
  bruno-requests, bruno-graphql-docs, bruno-schema, bruno-schema-types, bruno-toml.
- **Mid consumers:** bruno-js → (common, query); bruno-converters → (common, schema; schema-types
  as devDep); bruno-filestore → (common, lang; schema-types as devDep).
- **Top consumers (things flow *into* them, never out):** bruno-cli → (common, converters,
  filestore, js, lang, requests); bruno-electron → (common, converters, filestore, js, lang,
  requests, schema); bruno-app → (common, converters, graphql-docs, schema).

Guardrails this enforces:

1. **bruno-common is the browser-safe base leaf.** It runs in the web renderer (`bruno-app`), not
   just Node, so it must stay platform-neutral: no Node built-ins (`fs`, `path`, `os`, `crypto`,
   `child_process`, `node:*`) and no dependency that itself pulls in Node. It currently ships with
   zero runtime dependencies — keep it that way. It also depends on no other `@usebruno/*` package;
   a util that needs Node or another bruno package belongs in a different package.
2. **No shared/library package may import bruno-app or bruno-electron.** Renderer- or
   Electron-specific code must not be pushed down into a lib to make it importable upward.
3. **bruno-js must stay Electron-free.** It runs in both the Electron main process *and* the CLI
   (bruno-cli → js). Adding an `electron`/IPC import to bruno-js breaks the CLI. Sandbox logic
   belongs in bruno-js; host wiring belongs in bruno-electron.
4. **bruno-schema-types is types-only** (a *devDependency* of converters/filestore, built with
   plain `tsc`). Import types from it; never add runtime code or a runtime import of it.
5. **bruno-schema (Yup) and bruno-schema-types (TS types) are distinct and both live.** app +
   converters use `@usebruno/schema` for runtime validation; filestore + converters use
   `@usebruno/schema-types` for compile-time types. A data-model change usually touches both.
