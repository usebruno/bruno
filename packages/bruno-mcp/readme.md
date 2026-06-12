# Bruno MCP

A [Model Context Protocol](https://modelcontextprotocol.io/) server for Bruno. Lets AI coding tools (Claude Desktop, Claude Code, Cursor, MCP Inspector) discover and execute Bruno collections using Bruno's existing runtime — auth, environments, OAuth2 cached tokens, and scripts all work transparently. Credentials are never exposed to the agent.

> Status: POC. Not yet published to npm.

## Installation

Once published, install globally:

```bash
npm install -g @usebruno/mcp
```

Or run without installing:

```bash
npx -y @usebruno/mcp
```

During the POC, point your MCP client at the binary inside this repo:

```
/path/to/bruno/packages/bruno-mcp/bin/bruno-mcp.js
```

## Quick start

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "bruno": {
      "command": "npx",
      "args": ["-y", "@usebruno/mcp"]
    }
  }
}
```

Fully quit Claude Desktop (⌘Q) and reopen. The 🔨 icon in the chat input should list the Bruno tools.

### Claude Code

```bash
claude mcp add bruno -- npx -y @usebruno/mcp
```

Open a new `claude` session to pick up the registration.

### Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "bruno": {
      "command": "npx",
      "args": ["-y", "@usebruno/mcp"]
    }
  }
}
```

### MCP Inspector

```bash
npx @modelcontextprotocol/inspector npx -y @usebruno/mcp
```

## What you can ask the agent

```
"List my Bruno collections."

"In the api-tests collection, run get-user against the dev environment."

"Show me the request URL and body of users/create-user.bru."

"Create a new Bruno collection at ~/projects/my-api with a request that
 POSTs to https://example.com/users with a JSON body."
```

## Tools

| Tool | Purpose |
|---|---|
| `list_collections` | List registered collections with their environments |
| `list_requests` | List every request in a collection (flat, with relative path + method + URL) |
| `execute_request` | Execute a single request via `bru run`; returns status, headers, body, assertions, test results |
| `create_collection` | Create a new collection on disk (yml default, bru option); auto-registers |
| `create_request` | Create a new `.bru`/`.yml` request file; format auto-matched to the target collection |
| `create_environment` | Create a new environment file under `environments/` |

All tools refuse to overwrite existing files. Authoring tools route through `@usebruno/filestore`'s canonical stringifier — no hand-rolled templates, no drift if the `.bru`/`.yml` format evolves.

## Collection discovery

When you start `bruno-mcp` it figures out which collections to expose. Sources, in priority order:

1. **Explicit flags** — `--collection <path>` and/or `--workspace <path>` (both repeatable)
2. **CWD walk-up** — looks for `workspace.yml` / `bruno.json` / `opencollection.yml` walking up from the current directory (same way `git` finds `.git/`)
3. **Bruno desktop preferences** — reads `lastOpenedWorkspaces` and `lastOpenedCollections` from Bruno desktop's `preferences.json`:
   - macOS: `~/Library/Application Support/bruno/preferences.json`
   - Windows: `%APPDATA%/bruno/preferences.json`
   - Linux: `~/.config/bruno/preferences.json`

Whichever source produces results first wins; the others are not consulted. This means:

- Run `claude` (or any MCP client) **inside a Bruno collection directory** → that collection is exposed.
- Run **inside a workspace directory** → all member collections from `workspace.yml` are exposed.
- Run **from any other directory** → whatever you have open in Bruno desktop is exposed.
- Pass `--collection` / `--workspace` to override everything.

Discovery is a snapshot at startup. If you open a new collection in Bruno desktop while the MCP server is running, restart your AI client to pick it up.

## CLI options

```
Usage: bruno-mcp [--collection <path>] [--workspace <path>]
                 [--cwd-path <path>] [--no-cwd-discovery] [--no-auto-discovery]
```

| Flag | Description |
|---|---|
| `--collection <path>`, `-c` | Path to a Bruno collection directory. Repeatable. |
| `--workspace <path>`, `-w` | Path to a Bruno workspace directory. Repeatable. Expands to all member collections. |
| `--cwd-path <path>` | Override the CWD used for walk-up discovery. |
| `--no-cwd-discovery` | Disable the CWD walk-up step. |
| `--no-auto-discovery` | Disable the Bruno desktop preferences fallback. |
| `--verbose` | Log debug info to stderr (visible in your MCP client's debug view). |
| `--help`, `-h` | Show help. |

## How execution works

`execute_request` spawns `bru run <request> --env <name> --reporter-json <tmpfile>` from the collection root. This means:

- Same code path as the official Bruno CLI — OAuth2 token cache, env interpolation, auth interceptors (Basic / Bearer / OAuth2 / AWS sig / NTLM / Digest / API key / WSSE / client certs), pre-request scripts, post-response scripts, assertions, and tests all behave identically to clicking "Send" in Bruno desktop.
- **Credentials never appear in the MCP response.** The reporter shows headers from the *prepared* request (with `{{token}}` interpolation placeholders preserved), not the resolved Authorization header.
- Response bodies larger than 50 KB are truncated inline and spilled to a temp file path so they don't blow up the agent's context window.

## Authoring safety

- Agents cannot inject script content. `create_request` has no `script` field in its schema; pre-request, post-response, and test scripts can only be added by editing the file directly in Bruno.
- Path traversal is blocked: `folder` arguments to `create_request` must be relative and cannot contain `..`.
- All authoring tools refuse to overwrite existing files. To replace a request, delete it first.

## Project layout

```
bruno-mcp/
├── bin/bruno-mcp.js     Shebang entry; what MCP clients spawn
├── src/
│   ├── cli.js           Arg parsing + discovery orchestration
│   ├── server.js        MCP server wiring (McpServer + 6 tools)
│   ├── collections.js   In-memory registry (list / resolve / register)
│   ├── discover.js      CWD walk-up + preferences.json reader
│   ├── execute.js       Spawns `bru run`, parses reporter JSON
│   ├── author.js        Create-collection/request/environment helpers
│   └── index.js         Programmatic API
└── package.json
```

## Limitations

POC scope. Not yet shipped:

- HTTP / streamable-HTTP transport — only stdio.
- Batch execution (`run_folder`) — one request per call.
- Interactive OAuth2 authorization-code flow — POC reuses tokens already cached by Bruno desktop.
- Streaming response bodies (SSE).
- Live sync with Bruno desktop — collection list is a snapshot at MCP server start.
- Per-request UI confirmation (would require Electron-embedded variant).

## License

MIT
