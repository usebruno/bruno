## What's New in Bruno v4.1.0

Bruno v4.1.0 brings major improvements to everyday API development, with Google Cloud Secret Manager support, enhanced Git workflows, global client certificates, richer Docs editing with syntax highlighting, and one-click BRU to YAML migration. It also improves collection management, security, CLI workflows, import/export and overall app reliability.

### Richer Docs Editing and Reading

Docs can now be written in a rich text editor with a formatting toolbar, so you no longer need to know Markdown syntax. The editor supports headings, text styles, lists, tables, code blocks, checkboxes, quotes and more.

Code blocks support syntax highlighting with automatic language detection and a language selector.

![The Rich Docs editor in Bruno](https://d3icksk7srk4uh.cloudfront.net/v4.1.0/rich-text-editor.png)


[Read Docs →](https://link.usebruno.com/docs/editor?version=4.1.0)

### Google Cloud Secret Manager Support

External Secrets now support Google Cloud Secret Manager. Bruno can work with secrets stored in:

* AWS Secrets Manager
* Azure Key Vault
* HashiCorp Vault
* Google Cloud Secret Manager

Authenticate with a GCP service account key, fetch secrets from a selected project, and use them across requests, scripts, and environments exactly as with the other providers.

Secret handling is also more reliable this release: autocomplete no longer suggests invalid references or lists external secrets twice, secret previews show the correct scope, and duplicate secret names are handled properly.

![GCP Secret Manager Integration in Bruno](https://d3icksk7srk4uh.cloudfront.net/v4.1.0/gcp.png)

[Read Docs →](https://link.usebruno.com/docs/secret-managers/gcp/overview?version=4.1.0)

### Git Workflow Improvements

Git work in v4.1.0 covers both new capability and enterprise network support.

* **Choose a branch for Pull and Push.** Pull and Push are no longer limited to `main`. You can pick a remote and a branch inline, and retry an operation that fails.
* **A prompt before you edit main.** The first time you edit a synced collection while on the default branch, Bruno offers to create a branch for you.
* **Proxy and certificate support for Git.** Git operations and GitHub provider calls now respect Bruno's proxy mode, no-proxy list, and custom CA certificates. This unblocks users behind a corporate proxy and users on GitHub Enterprise Server with an internal or self-signed certificate.
* **Workspace submodule tracking.** Fetch now detects new commits in linked collection repositories instead of reporting no changes.
* **Fixes.** The remotes modal no longer reappears on every visit to the Git screen, the provider API URL field saves the correct value, and Git operations on migrated YAML collections no longer throw.

### Global Client Certificates

Client certificates can now be configured once at the app level instead of being duplicated in every collection.

* Define global certificates in Preferences and let collections inherit them
* Enable or disable each certificate individually
* Collection certificates still take precedence for matching domains
* Works across HTTPS, gRPC, and WebSocket requests
* Supported in CLI certificate config flows

![Global Client Certs in Bruno](https://d3icksk7srk4uh.cloudfront.net/v4.1.0/client-cert.png)

[Read Docs →](https://link.usebruno.com/docs/client-certificates?version=4.1.0)

### Generated Docs Playground

* Inherited auth from folders and parent requests now resolves correctly
* Variable hover cards support highlighting and inline editing
* Field descriptions show in the params, headers, and variables tables
* The method dropdown includes TRACE, CONNECT, and Add Custom
* Response actions for copy, download, and clear, plus a response format selector and layout options
* Copying an example as a code snippet works again

### BRU to YAML Migration

You can migrate existing .bru collections to the OpenCollection YAML format in one click from the collection overview, making it easier to move off the deprecated .bru format.

[Read Docs →](https://link.usebruno.com/docs/opencollection?version=4.1.0)

### Open Multiple Collections at Once

Opening a folder now scans nested folders for Bruno collections, so a monorepo holding several collections can be brought in as one step instead of importing each collection individually.

### Default Environment for Collections

You can now store a default environment with a collection. Bruno selects it automatically the first time the collection is opened or imported. The default travels with the collection and is preserved on exports.

### Editor and Navigation

* **Search and Replace.** Bruno now has its own replace UI with Replace and Replace All. Use Cmd/Ctrl + F for search and Cmd + Option + F or Ctrl + H for replace.
* **Sort and reorder variables.** Sort variables by name, drag & drop to reorder them.
* **Search the environment selector.** Filter environments by name in the selector dropdown instead of scrolling a long list.
* **Ignore a folder from the sidebar.** Right-click a folder and choose Ignore folder, with no config file editing required.
* **Sidebar state persists** across restarts, including expand state and width.

### Security Fixes

* **Authorization headers on redirects.** A new Forward Authorization on Redirect toggle in request Settings decides whether auth headers follow a redirect to a different origin.
* **File operations stay inside open collections.** Bruno now blocks writes, renames, moves, and deletes outside a collection you have open.

### CLI

* New `--global-env-var key=value` flag to override global environment variables at runtime. `bru.getGlobalEnvVar()` now returns the override.
* Client certificate configuration flows work in the CLI.
* OpenAPI import no longer produces `..bru` filenames when an operation summary ends with a period.

### Scripting

* `res.getHeader()` is now case-insensitive.
* `bru.runner.stopExecution()` now stops a collection run when called from a test
* npm modules resolve correctly from `additionalContextRoots` node_modules again

### Import, Export, and Interoperability

* Postman import preserves scripts, auth, NTLM config, binary bodies, and descriptions, and there is a new preserve scripts option for import and export
* Postman export retains OAuth2, AWS, Digest, and OAuth1 auth settings
* OpenAPI import keeps collection-level and tag-level descriptions and populates the Docs tab
* OpenAPI export retains scheme-less request URLs
* OpenCollection export keeps environment variable descriptions and post-response variables at collection and folder level
* cURL import handles `--data-binary` with inline JSON instead of crashing
* `flow: sequential` is honoured for YAML collections and included in Single File YAML export

### Networking

* System and PAC proxy mode no longer adds latency per request on firewalled networks
* Proxy refresh now reflects current content

### Other Fixes

* WebSocket duplicate connections when sending mid-reconnect, and message bodies not expanding with File Cache on
* Transient requests failing to create when WebSocket is the request type in collection Presets
* Runner cancellation and iteration stability, including folder runs with iterations, the loader continuing after cancel, Run Again for iterative runs, and the app refreshing on Enter in the iteration count field
* Workspace Home now notifies you when a collection fails to open
* Request timeout set to Inherit in Settings now saves as `inherit` for YAML requests instead of resetting to 0
* Environment autosave, and duplicate names in collection secrets
* OpenAPI Spec Viewer `$ref` resolver errors and the broken error state
* Response Visualizer handles invalid data formats instead of crashing
* Folder sequencing when moving a folder to the bottom of the list
* Ctrl + W closes tabs for newly saved transient requests and JS files
* Long tokens overflowing the Security tab input, GraphQL tooltip font size, DevTools window overlapping the environment button, truncated URLs in docs, missing outlines on bulk edit search bars, and Network panel filter options at small window sizes

---

For the complete list of changes, see the [Release changelog](https://www.usebruno.com/changelog).
