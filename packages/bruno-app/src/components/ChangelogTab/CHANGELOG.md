## What's New in Bruno v4.3.0

Bruno v4.3.0 is a trust and visibility release. Secrets from external managers no longer touch disk. Configuration a request inherits from its folder and collection is now visible on the request itself. When a variable fails to resolve, Bruno says so instead of quietly sending a broken request.

Highlights include **external secrets held in memory**, a **Bruno MCP server** for AI coding tools, **inherited auth and headers shown on the request**, and **unresolved variable warnings**. It also brings folder-level tags, a whole-run stop in the collection runner, Git improvements, and three new themes.

<h3>External Secrets Stay in Memory</h3>

External secrets are no longer saved to disk. Bruno fetches them only when a request that uses them is sent, and holds them in memory for the session, separately for each environment. They are cleared when the app or the collection closes. Only the configuration is saved: the provider, the secret names, and the bindings.

This is the change enterprise security tooling has been asking for. Secrets are no longer at rest on disk.

The send flow now explains each failure instead of failing silently:

* **Missing values.** A warning lists them, and the request still sends.
* **Failed fetch.** Nothing is sent, and a Secret Fetch Error links straight to the secret configuration.
* **No provider account selected.** A modal lets you pick or add one before the send continues.

GraphQL and WebSocket requests now resolve external secrets too.

### Unresolved Variable Warnings

When a variable fails to resolve, Bruno tells you after the request runs, instead of quietly sending the unresolved placeholder.

### Bruno MCP Server

AI coding tools that speak the Model Context Protocol can now list Bruno collections and requests, and run a request in any environment. Claude Code, Cursor, and other MCP clients are supported.

Bruno's own runtime handles auth and variables, so credentials are never exposed to the AI client. Every run requires explicit confirmation from you before it is sent.

### Collection Runner

* **Folder-level tags.** Tags set on a folder apply to every request inside it, and work with the runner's Include and Exclude filters.
* **Stop the whole run.** `bru.runner.stopExecution()` now halts the entire run across iterations, in both the desktop app and the CLI.
* **Responses kept out of memory.** Iteration responses are persisted to queryable storage rather than held in memory, so large multi-iteration runs keep memory flat. This completes the runner memory work started in v4.2.0.

### Try a Saved Response Example

Saved response examples gain a **Try** action. It replays the example's request in a new transient tab, without changing the saved request or the example.

### Inherited Auth and Headers

A request set to Inherit auth now shows the effective auth, read-only, with a link to where it is configured.

The Headers tab gains an **Inherited Headers** section listing headers from parent folders and the collection. Each one links back to its source, so you can see what will actually be sent without opening every parent.

### Git

* **Clone with a branch.** Clone Repository accepts an optional branch.
* **Deleted-file conflicts.** Merge conflicts on deleted files can be resolved in the Git UI.
* **All branches visible.** Imported repos with multiple branches show every branch.

### API Specs

API specs open as workspace tabs, and a new **From URL** template lets you start a spec from a remote document.

### Themes and Polish

* **New themes:** Gruvbox, Dracula, and Cyberdream.
* Sidebar context menu shortcuts are right-aligned, with the proper modifier symbols.
* The General pane in Preferences is regrouped into clear sections.
* License keys are masked in License Settings.

---

For the complete list of changes, see the [Release changelog](https://www.usebruno.com/changelog).
