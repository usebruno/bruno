# PRD + RFC: Agent-Friendly Bruno CLI — JSON Contract

**Status:** Draft
**Owner:** @sanish-bruno
**Target package:** `packages/bruno-cli`
**Created:** 2026-07-01

---

## TL;DR

Make the `bru` CLI a first-class surface for AI agents and automation without introducing a database, daemon, or MCP server. We do this by adding (1) a versioned JSON I/O contract, (2) introspection and schema commands so agents can discover the tool, (3) an NDJSON event stream for `bru run`, (4) JSON-driven CRUD commands that round-trip through `.bru` files, and (5) a long-lived `bru serve` mode to amortise startup cost. The filesystem stays canonical — every new command is a thin façade over the same `.bru` files a human edits.

---

# Part 1 — PRD

## 1.1 Problem

Bruno's CLI today is excellent for **executing** a checked-in collection in CI: rich reporters, granular exit codes, data-driven runs, mTLS, scripted tests. It is weak as a surface for **agents** because:

- There is no machine-readable way to **discover** what's in a collection (`bru ls` doesn't exist).
- There is no machine-readable way to **introspect** the CLI itself — agents have to parse `--help` text, which is brittle.
- There is no way to **author or mutate** a collection from the CLI; agents must write `.bru` syntax by hand. The `.bru` grammar is human-readable, but it is one more thing for the agent to get right.
- `bru run` reports results only at the end (or to a file via `--reporter-json`). Agents can't stream progress or bail early on a structured signal.
- There is no way to **dry-run** a request and inspect the resolved payload without sending it.
- Each invocation pays Node.js + bruno-lang startup cost (~hundreds of ms). Agents that orchestrate dozens of calls feel this.

Bruno can close this gap by leaning into its existing advantages — plain-text files, Git-friendliness, mature execution — and shipping a versioned JSON contract on top.

## 1.2 Goals

1. An agent that has never seen Bruno before can, given only the `bru` binary, **discover** the command surface, **list** a collection, **read** any request, **dry-run** any request, **execute** the collection with streaming feedback, and **react to failures** by error code.
2. An agent can **author and mutate** requests, folders, environments, and collection variables via JSON payloads, with the changes appearing on disk as well-formed `.bru` files that a human would have written.
3. The JSON output of every command is stable, versioned, and never changes silently — agents can pin to a major version.
4. None of the above introduces a database, a daemon process required for normal use, an out-of-band index, or an MCP server.
5. Existing human-facing CLI behaviour, exit codes, and reporter formats are preserved unchanged. Agent affordances are **additive** and opt-in (`--json`).

## 1.3 Non-Goals

- **No MCP server.** Agents that speak MCP shell out to the CLI; we are not maintaining a second surface.
- **No database / index.** `.bru` on disk remains the only source of truth.
- **No GUI changes.** This RFC does not touch the Electron app.
- **No new scripting APIs.** The sandbox is unchanged.
- **No protobuf, gRPC, or binary protocol** for the JSON contract.
- **No remote / hosted mode.** `bru` continues to run locally against a directory.

## 1.4 Users & Use Cases

| User | Use case |
|---|---|
| Agent in an IDE (Cursor, Codex, Claude Code) | "Add a `POST /users` request to the auth folder that uses the existing `accessToken` env var, then run it against the Local env and tell me what failed." |
| Agent in a CI job | "Run the smoke tag, stream results, and post a Slack summary the moment any request fails — don't wait for the full run." |
| Agent doing API exploration | "Walk this collection and tell me which requests are missing tests, then propose tests for each." |
| Human in a terminal | Unchanged — `bru run`, `bru import` continue to work exactly as today. |
| CI pipeline | Unchanged — `--reporter-junit`, exit codes, etc. continue to work. |

## 1.5 Success Metrics

- **Discoverability:** an agent given only the binary can produce a valid `bru request add --json` payload after at most one `bru introspect` call and one `bru schema request` call.
- **Streaming:** time from a request failure inside `bru run` to the agent observing a failure event is ≤ the request's duration + 50ms (i.e., effectively realtime via NDJSON), down from "end of run" today.
- **Mutation safety:** every JSON-driven write produces a `.bru` file byte-identical to what `jsonToBru` produces for the equivalent input; round-tripping `bruToJson → jsonToBru` is the identity on all fixtures in `bruno-lang/v2/tests`.
- **Backwards compatibility:** zero changes to the human-readable stdout of any existing subcommand when `--json` is **not** passed. Zero changes to existing exit codes.
- **Startup amortisation:** in `bru serve --stdio`, p50 per-command latency for `request.get` and `request.edit` is ≤ 20ms after warm-up, vs ≥ 300ms per cold invocation.

## 1.6 Scope (Phased)

We do not have to ship everything at once. Three phases:

| Phase | Contents | Risk |
|---|---|---|
| **P1 — Read & run** | `bru introspect`, `bru ls`, `bru schema`, `bru get`, `bru run --json` (NDJSON event stream), `bru run --dry-run`, `--json-version`, structured error envelope on stderr | Low — read-only, additive |
| **P2 — Write** | `bru request add/edit/delete`, `bru folder add/edit/delete`, `bru env set/unset`, `bru collection-var set/unset`, all `--json` driven, with `--if-not-exists` / `--update` idempotency | Medium — filesystem mutations, must round-trip through bruno-lang cleanly |
| **P3 — Long-lived mode** | `bru serve --stdio` accepting NDJSON commands on stdin, emitting NDJSON responses on stdout | Medium — new process lifecycle, watch semantics |

Each phase is shippable on its own. P1 alone closes most of the agent gap.

## 1.7 Open Product Questions

1. Should `bru schema` derive its schemas from the existing `@usebruno/schema` package, or hand-author CLI-output schemas? Tension: re-use vs. decoupling CLI output from internal data shapes.
2. How aggressively should we redact secrets in streamed events? Default-on with `--include-secrets` opt-out, or default-off mirroring today's reporter behaviour?
3. Should `bru serve --stdio` use [JSON-RPC 2.0](https://www.jsonrpc.org/specification) or a Bruno-specific NDJSON envelope? JSON-RPC is well-known but heavier; bespoke is leaner but one more spec to learn.
4. Do we ship `bru get response` (a way to retrieve the last response from disk) in P1 or P2? Depends on whether we want to commit to persisting responses anywhere outside the in-memory runner.

---

# Part 2 — RFC: The JSON Contract

## 2.1 Versioning

The JSON contract is versioned with a single integer.

- The current version is exposed as `bru --json-version` (returns e.g. `1`) and on every envelope as `"version": 1`.
- Agents pin with `bru <cmd> --json --json-version=1`. If the CLI is newer and `1` is still supported, output conforms to v1. If `1` is no longer supported, the CLI exits with code `9` (invalid output format requested) and writes a structured error.
- A **major** version bump is the only thing that may break field names, types, or required-ness. Adding new optional fields is **not** a major change — agents must ignore unknown fields.
- We ship v1 with the first agent-facing release and commit to supporting v1 for at least 12 months after v2 lands.

## 2.2 Global Conventions

### `--json`

- Available on every subcommand. When passed, **stdout is exclusively JSON or NDJSON.** No banners, no tables, no ANSI colour, no progress dots.
- When `--json` is not passed and stdout is not a TTY, the CLI auto-disables ANSI but keeps the human-readable format — this is the existing behaviour and stays.

### Stdin

- Any command accepting `--json '<payload>'` also accepts `--json -` to read the payload from stdin. This lets agents avoid argv-length limits and shell-escaping.

### Stdout vs stderr

- **stdout:** the JSON envelope(s) for the command's result.
- **stderr:** human-readable diagnostic text (when `--json` is **not** set) **or** a single JSON error envelope (when `--json` **is** set and the command failed).
- Neither stream is interleaved with the other.

### Exit codes

The existing exit codes (0–9, 255) are preserved unchanged. New error categories from new commands map to **255** unless they precisely match an existing code's meaning. We will **not** silently re-use code `1` for non-run failures.

## 2.3 Output Envelope

All JSON output uses a common envelope:

```json
{
  "version": 1,
  "kind": "request.get",
  "ok": true,
  "data": { /* command-specific payload */ },
  "meta": {
    "cli_version": "2.x.x",
    "collection_path": "/abs/path",
    "elapsed_ms": 12
  }
}
```

- `kind` is `"<noun>.<verb>"` and identifies the schema of `data`. Agents dispatch on this.
- `ok: true` means the command succeeded. On failure, see §2.6.
- `meta` carries non-essential context. Agents may ignore it entirely.

NDJSON streams (§2.4) use the **same envelope per line**. Every line is independently parseable.

## 2.4 NDJSON Event Stream — `bru run --json`

When `--json` is passed to `bru run`, stdout becomes a newline-delimited stream of envelopes. Each line is a complete JSON object. The stream ends with exactly one `run.end` envelope.

### Event kinds

| `kind` | When emitted | Key `data` fields |
|---|---|---|
| `run.start` | Once, before any request | `collection`, `env`, `total_requests`, `filters` |
| `request.start` | Before each request fires | `path`, `name`, `method`, `url`, `iteration` |
| `request.script.log` | Each `console.log` from pre/post/test scripts | `phase`, `level`, `message` |
| `request.response` | After response received | `status`, `status_text`, `duration_ms`, `size_bytes`, `headers` (redacted), `body_preview` |
| `assertion.result` | Per assertion evaluated | `description`, `passed`, `lhs`, `rhs`, `operator`, `error?` |
| `test.result` | Per `test(...)` call | `name`, `passed`, `error?` |
| `request.end` | After each request fully completes | `path`, `status`, `passed`, `failed`, `skipped`, `reason?` |
| `run.end` | Once, at the very end | Identical shape to today's `--reporter-json` summary, plus `exit_code` |

### Streaming guarantees

- Events are emitted in **causal order per request**: `request.start` → (`request.script.log`)\* → `request.response` → (`assertion.result` | `test.result`)\* → `request.end`.
- When running with `--parallel N` (future), events are still well-formed per request but may interleave across requests. The `path` field disambiguates.
- The process flushes after every line. Agents can rely on a fresh `\n` meaning "this event is now durable for you to act on."
- On `--bail`, the stream still emits `request.end` for the failing request, then `run.end` with `exit_code: 1`, then exits. No torn events.

### Compatibility with `--reporter-json`

The existing `--reporter-json <path>` reporter is **unchanged**. `--json` (stdout NDJSON) and `--reporter-json` (final file) can be used together; one streams, the other dumps the summary.

## 2.5 Subcommand Schemas (P1)

### `bru introspect --json`

Returns the entire command tree, every flag, type, default, and one example per command. This is the agent's bootstrap call.

```json
{
  "version": 1,
  "kind": "introspect",
  "ok": true,
  "data": {
    "cli_version": "2.x.x",
    "json_contract_version": 1,
    "commands": [
      {
        "name": "run",
        "summary": "Run one or more requests/folders",
        "args": [{ "name": "paths", "variadic": true, "type": "path" }],
        "flags": [
          { "name": "--env", "type": "string", "summary": "Environment name" },
          { "name": "--json", "type": "boolean", "summary": "Emit NDJSON event stream on stdout" },
          { "name": "--dry-run", "type": "boolean", "summary": "Resolve and print requests without sending" }
        ],
        "examples": [
          "bru run --env Local --json"
        ],
        "exit_codes": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 255]
      }
    ]
  }
}
```

### `bru ls --json [path]`

Walks the collection starting at `path` (default: cwd if inside a collection) and emits the tree.

```json
{
  "version": 1,
  "kind": "ls",
  "ok": true,
  "data": {
    "collection": { "name": "My API", "path": "/abs/path" },
    "items": [
      { "type": "folder", "path": "auth", "name": "auth" },
      { "type": "request", "path": "auth/login.bru", "name": "login", "method": "POST", "url": "{{baseUrl}}/login", "tags": ["smoke"], "has_tests": true },
      { "type": "environment", "path": "environments/Local.bru", "name": "Local" }
    ]
  }
}
```

`--depth N` limits recursion. `--filter tag:smoke` and `--filter folder:auth/*` apply (see §2.7).

### `bru schema <kind> --json`

Returns the JSON Schema for a Bruno resource. `<kind>` is one of `request`, `folder`, `environment`, `collection`, `collection-var`. The schema is the one used by `bru request add --json` etc., so agents introspect-then-author.

```json
{
  "version": 1,
  "kind": "schema",
  "ok": true,
  "data": {
    "resource": "request",
    "schema": { "$schema": "https://json-schema.org/draft/2020-12/schema", "type": "object", "...": "..." }
  }
}
```

`bru schema cli-output --json --kind=run.end` returns the JSON Schema for the output envelope of a given `kind`. This lets agents validate their parser.

### `bru get request <path> --json`

Returns a single request as JSON (the result of `bruToJson(file)`), wrapped in the standard envelope.

```json
{
  "version": 1,
  "kind": "request.get",
  "ok": true,
  "data": {
    "path": "auth/login.bru",
    "request": { "method": "POST", "url": "{{baseUrl}}/login", "headers": [...], "body": {...}, "tests": "...", "...": "..." }
  }
}
```

Variants: `bru get folder <path>`, `bru get environment <name>`, `bru get collection`.

### `bru run --dry-run --json`

Resolves all variables, auth, scripts (pre-request only), and emits the **final request** without sending it. One envelope per request.

```json
{
  "version": 1,
  "kind": "request.dry_run",
  "ok": true,
  "data": {
    "path": "auth/login.bru",
    "resolved": { "method": "POST", "url": "https://api.example.com/login", "headers": [...], "body": "{...}", "auth_applied": "bearer" },
    "variables_used": ["baseUrl", "accessToken"]
  }
}
```

This is the single highest-leverage debug primitive — agents can verify "what would be sent" without side effects.

## 2.6 Error Envelope

When `--json` is set and a command fails, **stderr** receives exactly one line containing the error envelope; **stdout** is empty.

```json
{
  "version": 1,
  "kind": "error",
  "ok": false,
  "error": {
    "code": 7,
    "name": "env_override_invalid",
    "message": "Environment override must be a string or object, got number",
    "hint": "Use --env-var KEY=VALUE or --env-var KEY=@json:'{...}'",
    "docs_url": "https://docs.usebruno.com/bru-cli/env-overrides",
    "details": { "received_type": "number", "argument_index": 2 }
  }
}
```

- `code` is the process exit code. Always one of the documented exit codes.
- `name` is a stable string slug. Agents branch on this, **not** on `message`.
- `details` is free-form per-error context. Agents may ignore it.

A non-exhaustive map of `code → name`:

| code | name |
|---|---|
| 1 | `run_failed` |
| 2 | `output_dir_missing` |
| 3 | `request_loop` |
| 4 | `not_in_collection` |
| 5 | `input_not_found` |
| 6 | `env_not_found` |
| 7 | `env_override_invalid` |
| 8 | `env_override_malformed` |
| 9 | `invalid_output_format` |
| 255 | `internal_error` (with `details.cause`) |

## 2.7 Selectors

Today, request selection is positional (`bru run path1 path2 folder/`). For agents, this is awkward to compose. We add `--filter` (repeatable, ANDed):

| Filter | Semantics |
|---|---|
| `--filter tag:<name>` | Only requests with this tag |
| `--filter folder:<glob>` | Only requests under matching folder paths |
| `--filter method:<verb>` | Only requests with this HTTP method |
| `--filter has-tests` | Only requests with executable tests (replaces `--tests-only` long form; flag stays) |

Positional paths and `--filter` compose: the request must match the positional path **and** all filters.

## 2.8 Write Commands (P2)

All P2 mutations:

1. Validate the input against the corresponding schema before touching disk.
2. Write atomically (temp file + `rename`).
3. Round-trip through `bruno-lang`'s `jsonToBru` to produce a human-clean `.bru` file.
4. Are idempotent under explicit flags.

### `bru request add --json '{...}'`

```bash
bru request add --json '{
  "path": "auth/refresh.bru",
  "request": {
    "method": "POST",
    "url": "{{baseUrl}}/auth/refresh",
    "body": { "mode": "json", "json": "{\"token\": \"{{refreshToken}}\"}" },
    "tests": "test('200', () => expect(res.getStatus()).toEqual(200))"
  }
}' --if-not-exists
```

- `--if-not-exists`: succeed silently if the request already exists (used for safe retries).
- Without it: error `request_already_exists` (code 255 + name) if the file is present.

### `bru request edit <path> --patch '{...}'`

JSON Merge Patch (RFC 7396) semantics over the request JSON. `null` deletes a field. The whole file is rewritten via `jsonToBru` after applying the patch.

### `bru request delete <path>`

Deletes the file. Refuses to delete a folder containing other files unless `--recursive`.

Analogous commands exist for `folder`, `environment`, `collection-var`. All take the same envelope shape and emit the resulting resource on stdout (so agents don't have to re-read).

## 2.9 Long-Lived Mode (P3) — `bru serve --stdio`

A single `bru` process reads NDJSON command envelopes on stdin and writes NDJSON response envelopes on stdout. Each command is **stateless** with respect to the others — `bru serve` is purely a startup-cost amortiser, not a session manager.

### Request envelope (stdin)

```json
{ "id": "req-42", "command": "request.get", "args": { "path": "auth/login.bru" } }
```

### Response envelope (stdout)

```json
{ "id": "req-42", "version": 1, "kind": "request.get", "ok": true, "data": { "...": "..." } }
```

`id` is echoed verbatim. The agent uses it to correlate concurrent calls.

### Concurrency

Read commands may be served concurrently. Write commands are serialised per collection path to avoid torn writes. `bru run` started inside `serve` mode streams its NDJSON events back with the originating `id` on every event.

### Shutdown

EOF on stdin or `{"command": "shutdown"}` triggers a clean shutdown after in-flight commands finish.

### Why not JSON-RPC 2.0?

We considered it. Pros: well-known, batched requests, named errors. Cons: heavier envelope, requires libraries on the agent side, and our existing stdout envelope already covers the same ground. Decision: **bespoke NDJSON envelope** that mirrors the one-shot envelope. (Reconsider in v2 if multiple agents request JSON-RPC compatibility.)

## 2.10 Compatibility & Migration

- `bru` without `--json` is **unchanged**. Every existing user, every CI pipeline, every reporter continues to work.
- `--json` is **additive** on every command. A command that does not currently accept `--json` will accept it and emit an envelope after this RFC lands.
- The `--reporter-json` and `--reporter-junit` reporters stay. The NDJSON event stream (`--json` on `run`) is a strict superset of the reporter-json file content — the file format does not change.
- Exit codes stay. New error names map onto existing exit codes wherever the meaning matches; otherwise `255`.

## 2.11 Security & Secrets

- The NDJSON `request.response` event redacts the response body by default if the request used any auth (`Authorization` header, bearer, AWS v4, etc.) — agents see `"body_preview": "<redacted>"` unless `--include-secrets` is passed.
- Environment variables in `bru get environment` are returned **with values** by default — same behaviour as today's env file on disk, which the agent could read directly anyway. `--redact-secrets` opt-in to mask values matching `*secret*`, `*token*`, `*password*` patterns.
- The error envelope's `details` field is sanitised — file paths are absolute, but no request bodies or env values are ever placed in error details.

## 2.12 Rollout Plan

1. **Land P1 behind a feature flag** (`BRU_AGENT_MODE=1` or `--json` itself acts as the flag, since today no command accepts it). Ship in a minor release.
2. **Publish the JSON Schemas** under `packages/bruno-cli/schemas/v1/*.json` and a `bru schema cli-output --kind=<...>` accessor.
3. **Add a test fixture suite** that round-trips every `.bru` file in `packages/bruno-tests/collection` through `bru get request → bru request edit --patch '{}' (noop) → diff`. The diff must be empty.
4. **Document** in `packages/bruno-cli/readme.md` and `docs.usebruno.com/bru-cli/json-mode`.
5. **Gather feedback** for ~2 minor releases before locking v1.
6. **Land P2**, then **P3**, each as their own minor release.

## 2.13 Open Technical Questions

1. **Schema source of truth.** Do we generate `bru schema request` JSON Schema from `@usebruno/schema`'s Yup/Zod definitions, or hand-author? Generating is DRYer but couples CLI output to an internal lib's surface.
2. **Body size in NDJSON.** A 5MB response body would blow up the event stream. Cap `body_preview` at, say, 8KB by default, with `--max-body-bytes=N`? Or always truncate and require an explicit `bru get response <id>` follow-up?
3. **`bru get response`.** P1 has no response storage. Should we add an in-memory store keyed by run id, accessible only within `bru serve` mode?
4. **Watch semantics.** Should `bru ls --watch --json` be a thing in P1, or wait for P3's `serve` mode to provide subscription-style updates?
5. **`bru introspect` stability.** If we add a new flag to `bru run`, that changes `introspect`'s output. Is this a v1 break? Decision: no — `introspect` is "additive-only" within a major version, and agents must tolerate new flags appearing.
6. **Cross-platform line endings in NDJSON.** Lock to `\n` regardless of OS, including on Windows. Agents parse by `\n`, not `os.EOL`.

## 2.14 What We Are Explicitly Not Doing

- **No MCP server.** If an agent speaks MCP, it shells out to `bru` — same as a CI pipeline does.
- **No remote `bru` daemon.** `bru serve --stdio` is local, stdin/stdout-bound, and dies with its parent.
- **No new persistence.** No SQLite, no `.bru-cache`, no index files.
- **No breaking changes** to the existing CLI in v1.
- **No deprecation** of `--reporter-json` / `--reporter-junit` / `--reporter-html` — they remain the recommended file outputs for CI.

---

## Appendix A — Worked Example: An Agent Adds and Runs a Request

```bash
# 1. Discover the surface.
bru introspect --json > tools.json

# 2. Discover the request schema.
bru schema request --json > request.schema.json

# 3. List the collection to find the right folder.
bru ls --json --filter folder:auth

# 4. Read an existing request to copy its auth pattern.
bru get request auth/login.bru --json

# 5. Author the new request from a JSON payload on stdin.
cat <<'EOF' | bru request add --json - --if-not-exists
{
  "path": "auth/refresh.bru",
  "request": {
    "method": "POST",
    "url": "{{baseUrl}}/auth/refresh",
    "headers": [{ "name": "Content-Type", "value": "application/json", "enabled": true }],
    "body": { "mode": "json", "json": "{\"token\":\"{{refreshToken}}\"}" }
  }
}
EOF

# 6. Dry-run to verify what will be sent.
bru run auth/refresh.bru --env Local --dry-run --json

# 7. Execute with streaming feedback; the agent watches stdout line-by-line
#    and acts on the first `request.end` with `passed: false`.
bru run auth/refresh.bru --env Local --json
```

## Appendix B — Worked Example: NDJSON Event Stream

```
{"version":1,"kind":"run.start","ok":true,"data":{"collection":"/abs/path","env":"Local","total_requests":2,"filters":[]}}
{"version":1,"kind":"request.start","ok":true,"data":{"path":"auth/login.bru","name":"login","method":"POST","url":"https://api.example.com/login","iteration":1}}
{"version":1,"kind":"request.response","ok":true,"data":{"path":"auth/login.bru","status":200,"duration_ms":142,"size_bytes":318,"body_preview":"<redacted>"}}
{"version":1,"kind":"assertion.result","ok":true,"data":{"path":"auth/login.bru","description":"status is 200","passed":true}}
{"version":1,"kind":"request.end","ok":true,"data":{"path":"auth/login.bru","status":"passed","passed":1,"failed":0,"skipped":0}}
{"version":1,"kind":"request.start","ok":true,"data":{"path":"auth/refresh.bru","name":"refresh","method":"POST","url":"https://api.example.com/auth/refresh","iteration":1}}
{"version":1,"kind":"request.response","ok":true,"data":{"path":"auth/refresh.bru","status":401,"duration_ms":98,"size_bytes":52,"body_preview":"{\"error\":\"invalid_token\"}"}}
{"version":1,"kind":"assertion.result","ok":false,"data":{"path":"auth/refresh.bru","description":"status is 200","passed":false,"lhs":401,"rhs":200,"operator":"eq"}}
{"version":1,"kind":"request.end","ok":false,"data":{"path":"auth/refresh.bru","status":"failed","passed":0,"failed":1,"skipped":0}}
{"version":1,"kind":"run.end","ok":false,"data":{"total":2,"passed":1,"failed":1,"skipped":0,"duration_ms":240,"exit_code":1}}
```

## Appendix C — File Layout

```
packages/bruno-cli/
├── schemas/
│   └── v1/
│       ├── envelope.json
│       ├── error.json
│       ├── request.json
│       ├── folder.json
│       ├── environment.json
│       ├── collection.json
│       ├── events/
│       │   ├── run.start.json
│       │   ├── request.start.json
│       │   ├── request.response.json
│       │   ├── assertion.result.json
│       │   ├── test.result.json
│       │   ├── request.end.json
│       │   └── run.end.json
│       └── introspect.json
├── src/
│   ├── commands/
│   │   ├── run.js          # extended with --json NDJSON output
│   │   ├── introspect.js   # new
│   │   ├── ls.js           # new
│   │   ├── schema.js       # new
│   │   ├── get.js          # new (P1)
│   │   ├── request.js      # new (P2)
│   │   ├── folder.js       # new (P2)
│   │   ├── env.js          # new (P2)
│   │   └── serve.js        # new (P3)
│   └── json/
│       ├── envelope.js     # writeEnvelope, writeError, writeEvent
│       ├── version.js      # contract version constant + negotiation
│       └── redact.js       # secret-masking helpers
```
