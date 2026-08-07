# `@usebruno/mcp` - Architecture

Design decisions and invariants for the Bruno MCP server (`packages/bruno-mcp`, v0.1.0, branch `feat/bruno-mcp`). Standards of record: [`CODING_STANDARDS.md`](../../../CODING_STANDARDS.md), [`contributing.md`](../../../contributing.md), [`publishing.md`](../../../publishing.md).

## What it is

A stdio MCP server that lets AI clients discover and execute Bruno collections. Execution runs through the same code path as the Bruno CLI (`bru run`), so environments, scripts, assertions, tests, and every auth method behave identically to Bruno desktop. Credentials are resolved inside the runtime and never returned to the agent.

First release exposes three read/execute tools: `list_collections`, `list_requests`, `execute_request`. Authoring/run tools (`create_*`, `run_collection`) and their helpers were removed to scope the release.

## Module layout

| File | Responsibility |
|---|---|
| `src/index.ts` | CLI entry: `#!/usr/bin/env node` shebang + arg parsing (yargs) + discovery orchestration. Compiled to `dist/index.js`, which `bin` points at directly (what clients spawn). |
| `src/server.ts` | `createServer()` factory: `McpServer` + 3 tools, transport-agnostic |
| `src/types.ts` | Shared domain types |
| `src/transports/stdio.ts` | stdio transport bootstrap |
| `src/tools/` | One file per tool + `index.ts` (`registerTools`) + `helpers.ts` |
| `src/core/collections.ts` | In-memory collection registry |
| `src/core/discover.ts` | CWD walk-up + `preferences.json` reader |
| `src/core/execute.ts` | Spawns `bru run`, parses reporter JSON, redacts secrets |

TypeScript (ESM), compiled with a plain `tsc` to `dist/`, following the module layout of the official MCP reference servers (`bin` -> compiled entry with a baked-in shebang, no separate launcher shim + `createServer()` factory + one-file-per-tool + decoupled transport). `@usebruno/cli` stays JS/CommonJS and is consumed across the process boundary (spawned for execution; one deep-import via `createRequire`).

## Decisions

**Execute by spawning `bru run` as a subprocess** (not importing the runtime). Guarantees the exact CLI code path (env interpolation, auth interceptors, scripts, assertions, tests) with zero re-implementation, gives each execution its own in-memory OAuth2 token store (never shared with the desktop session), and bounds runaway/streaming requests with a hard timeout. Cost: per-request spawn overhead; depends on `require.resolve('@usebruno/cli/bin/bru.js')`.

**One deep-import into `@usebruno/cli` internals.** `collections.ts` imports `createCollectionJsonFromPathname` from `@usebruno/cli/src/utils/collection` via `createRequire` (untyped, no exports map). This is a private module path: a CLI refactor that moves it breaks `bruno-mcp` with no build-time signal. It ships in the published `@usebruno/cli@^4.0.0` tarball. Before publishing, decide: promote it to a real CLI export, or accept the coupling and document version lockstep.

**Exact-pinned CLI dependency.** `package.json` pins `@usebruno/cli` exactly (not `^`) because the deep import makes a floating range risky. In-repo it points at the workspace version (`1.16.0`); on extraction to a standalone repo, bump to the published `^4.0.0` (the workspace `1.16.0` is not the npm release). The reporter parser tolerates both old (`{results,summary}`) and new (`[{iterationIndex,results}]`) `--reporter-json` shapes (`normalizeReport`), verified against CLI 1.16 and 4.0.

**Credential redaction is deny-by-default.** `execute.ts` returns request header names only (values dropped) rather than redacting a known-sensitive allowlist, because a user can name an API-key header anything. This is the core security invariant.

**First-party over community servers.** Two community servers exist ([macarthy](https://github.com/macarthy/bruno-mcp), [jackmulligan-ire](https://github.com/jackmulligan-ire/bruno-mcp)). The first-party server reuses Bruno's real runtime and auth stack rather than re-implementing execution, never returns resolved secrets, and ships in-repo so it stays in lockstep with Bruno's execution path.

## Security invariants

- Request header values withheld (names only); request URL userinfo stripped and query-param values redacted; response `set-cookie` / `authorization` / `proxy-authorization` redacted. Child-process output and assertion/test detail withheld unless `--verbose`; status always returned. Each result's `redaction` field records what was withheld.
- Reporter JSON (transiently holds resolved secrets) written to a private per-process temp dir (0700), unlinked immediately after read; spilled bodies written 0600, cleaned on exit + SIGINT/SIGTERM.
- `bru run` spawned via `child_process.spawn` without a shell; `--env-var` names rejected if they contain `=`.
- `execute_request` resolves the collection root from the registry by `collectionId` (never an agent-supplied path); `requestPath` must exactly match a `relativePath` enumerated by `list_requests` (allowlist membership, not just resolves-inside-root).

## Open items

- **Tests** (largest gap): `tests/` is empty. Planned: unit coverage for redaction and discovery, plus an integration test that stands up a local HTTP server, runs a real request end-to-end, and asserts a Bearer token never appears in the result.
- **CLI coupling / pin**: resolve the `createCollectionJsonFromPathname` deep-import (promote vs. accept) and confirm the exact pin + bump process before publishing.
- **Cross-platform**: `0600` / `0700` file modes are Unix-only (Windows ignores them, so the "never world-readable" guarantee does not hold there); temp-dir cleanup (`fs.rmSync`) lacks `maxRetries` / `retryDelay`, so Windows AV/indexing/open-handle locks (EPERM/EBUSY) can leave residue.
- **Release**: publishing decision (npm vs. source-only, needs trademark OK per `publishing.md`), user-facing docs page, `SECURITY.md`, `CODEOWNERS` entry for `packages/bruno-mcp/`.
