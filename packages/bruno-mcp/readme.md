# Bruno MCP

A [Model Context Protocol](https://modelcontextprotocol.io/) server for Bruno. Lets AI clients (Claude Code, Claude Desktop, Cursor, MCP Inspector) discover and execute Bruno collections. Execution runs through the same code path as the Bruno CLI (`bru run`), so environments, scripts, assertions, tests, and every auth method behave identically to Bruno desktop.

> **Draft / work in progress.** Transport: stdio (local) only; run from source (not yet published to npm). This package currently lives in the Bruno monorepo and will be moved to a separate repository.

## Tools

| Tool | Purpose |
|---|---|
| `list_collections` | List registered collections with their environments. Read-only. |
| `list_requests` | List requests in a collection (relative path + method + URL); optional `search` and `method` filters. Read-only. |
| `execute_request` | Execute one request via `bru run`; returns status, response headers, body, assertions, test results. Takes `collectionId`, `requestPath`, optional `environment` and `variables` overrides. |

## Setup

Build first. Clients spawn the compiled entry (`dist/index.js`) directly, so it must exist before you configure a client; rebuild after source changes or use `npm run watch`:

```bash
npm install
npm run build --workspace @usebruno/mcp
```

Get the absolute path to the compiled entry and use it wherever a client config asks for the server command:

```bash
echo "$(pwd)/packages/bruno-mcp/dist/index.js"
```

### Claude Code

```bash
claude mcp add bruno -- node /abs/path/to/dist/index.js
# optional: pin a collection
claude mcp add bruno -- node /abs/path/to/dist/index.js --collection /path/to/collection
```

Verify with `claude mcp list`, then open a new session.

### Cursor / Claude Desktop

Add to `~/.cursor/mcp.json` (Cursor) or `~/Library/Application Support/Claude/claude_desktop_config.json` (Claude Desktop, macOS):

```json
{
  "mcpServers": {
    "bruno": {
      "command": "node",
      "args": ["/abs/path/to/dist/index.js", "--collection", "/path/to/collection"]
    }
  }
}
```

Reload Cursor (or toggle the server in Settings > MCP). Fully quit Claude Desktop (⌘Q) and reopen. Drop the `--collection` args to rely on auto-discovery.

### MCP Inspector

```bash
npx @modelcontextprotocol/inspector node /abs/path/to/dist/index.js
```

## Collection discovery

At startup the server resolves which collections to expose. Sources, first non-empty wins:

1. **Explicit flags**: `--collection` / `--workspace` (both repeatable; a workspace expands to its member collections).
2. **CWD walk-up**: looks for `bruno.json` / `opencollection.yml` / `workspace.yml` walking up from the current directory.
3. **Bruno desktop preferences** *(on by default; `--no-auto-discovery` to disable)*: `lastOpenedWorkspaces`, `lastOpenedCollections`, and the default workspace from `preferences.json`:
   - macOS: `~/Library/Application Support/bruno/preferences.json`
   - Windows: `%APPDATA%/bruno/preferences.json`
   - Linux: `~/.config/bruno/preferences.json`

## Options

Options are passed as CLI flags when the client spawns the server (see the setup snippets above).

```
Usage: bruno-mcp [--collection <path>] [--workspace <path>]
                 [--cwd-path <path>] [--no-cwd-discovery] [--no-auto-discovery] [--verbose]
```

| Flag | Description |
|---|---|
| `--collection <path>`, `-c` | Bruno collection directory. Repeatable. |
| `--workspace <path>`, `-w` | Bruno workspace directory. Repeatable; expands to member collections. |
| `--cwd-path <path>` | Override the CWD used for walk-up discovery. |
| `--no-cwd-discovery` | Disable the CWD walk-up step. |
| `--no-auto-discovery` | Disable the Bruno desktop preferences fallback. |
| `--verbose` | Log debug info to stderr. |
| `--help`, `-h` | Show help. |

## License

MIT
