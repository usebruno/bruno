## What's New in Bruno v4.0.0

Bruno v4.0.0 is our biggest release yet, with major improvements across the entire API workflow. This release introduces built-in AI assistance, reimagined Collection Docs and Playground, a redesigned Secret Manager, typed variables, Apps, faster startup for large collections, improved WebSocket workflows, and much more.

---

### AI-Powered Request Assistance

AI is now built directly into your Bruno workflow, helping you work across scripts, tests, and documentation without switching tools.

The new AI chat sidebar stays grounded in your active request, so its responses remain relevant to what you are currently working on.

* Generate scripts and test cases
* Draft inline request documentation
* Get autocomplete suggestions in the scripting editor
* Use your own OpenAI, Anthropic, or OpenAI-compatible endpoint

Bruno uses a **Bring Your Own Key (BYOK)** model, giving you control over your provider and account.

![Bruno AI chat sidebar grounded in the active request](%AI_IMG%)

[Configure AI](#preferences/ai) [Read Docs →](https://link.usebruno.com/docs/ai)

### Apps: Build Interactive Interfaces for Your APIs

Bruno Apps let you build interactive interfaces that connect directly to your APIs.

#### Request-level Apps

Every request now includes an **App** tab. Enable **App Mode** to replace the standard response pane with a custom interface.

Request-level Apps can:

* Trigger their parent request with custom variables
* Read the response body and headers
* Access the response status and duration
* Display test results

#### Collection-level Apps

You can also create standalone Apps within a collection.

Collection-level Apps can:

* Find and trigger requests by name or path
* Pass variables into requests
* Chain multiple requests together
* Read environment and collection variables
* Open in their own tabs

App code and state are stored alongside your requests and collections, making them easy to share through Git.

![Bruno Apps building an interactive interface on top of an API](%APPS_IMG%)

[Read Docs →](https://link.usebruno.com/docs/apps)

### Secrets Management, Fully Rebuilt

The Secret Manager has been completely redesigned.

Secret mappings now live alongside your environments instead of being stored in a separate `secrets.json` file. This makes secrets behave consistently with the rest of Bruno's environment system.

* Unified experience for environments and secrets
* Improved sharing and variable precedence
* Simpler setup for external secret providers

![Redesigned Secret Manager in Bruno](%SECRET_MANAGER_IMG%)

[Read Docs →](https://link.usebruno.com/docs/secret-manager)

### Descriptions for Variables and Request Fields

A new description column is available for:

* Variables
* Query and path parameters
* Headers
* Multipart form data
* URL-encoded request bodies

Descriptions support multiple lines and are preserved when importing or exporting collections, including descriptions from Postman and OpenAPI.

This makes it easier to explain what each field does without relying on inline comments or separate documentation.

![Description column for variables and request fields in Bruno](%DESCRIPTIONS_IMG%)

### Collection Docs Reimagined

Collection Docs now provide a modern, website-like documentation experience with improved navigation, richer request details, and shareable pages.

* Shareable page URLs
* Global documentation search
* New design system
* Support for light and dark themes
* Redesigned navigation sidebar
* Variable types and resolved-value previews
* Execution context for requests, folders, and collections

The interactive **Playground** is also much closer to the full Bruno experience. You can execute requests directly from your documentation using a redesigned application shell with broader request support.

[Read Docs →](https://link.usebruno.com/docs/collection-docs)

### Typed Variables and Better Scripting

Variables now support native data types across collections, environments, folders, and requests.

Instead of storing every value as a string, Bruno can now preserve:

* Strings
* Numbers
* Booleans
* Objects

This reduces the need to manually serialize and deserialize values when working with structured data in scripts.

Additional scripting improvements include:

* Variable mutations now persist by default
* New APIs for reading and managing collection variables

[Read Docs →](https://link.usebruno.com/docs/variables)

### More Authentication Options <span class="badge">Beta</span>

Bruno now includes native support for **Akamai EdgeGrid authentication**.

Select Akamai EdgeGrid from the authentication type dropdown on a request, folder, or collection.

![Akamai EdgeGrid authentication configuration in Bruno](%AKAMAI_EDGEGRID_IMG%)

[Read Docs →](https://link.usebruno.com/docs/auth)

### Faster Startup for Large Collections <span class="badge">Beta</span>

Bruno can now cache parsed collection data across sessions, significantly improving startup times for large collections and workspaces.

[Enable File Cache](#preferences/cache)

### Better WebSocket Workflows

WebSocket requests now support multiple saved messages within the same connection.

You can create and manage a collection of messages, then send them individually without repeatedly recreating payloads.

[Read Docs →](https://link.usebruno.com/docs/websocket)

### A Better Changelog and Notification Experience

Each Bruno update now has a dedicated Changelog page that opens in a new tab after upgrading.

Notifications have also been redesigned to focus on:

* Product announcements
* Feature discovery
* Important Bruno updates

### OpenCollection YAML: The Future of Bruno

Bruno is beginning its transition from the legacy `.bru` format to the **OpenCollection YAML** format.

OpenCollection YAML provides a readable, portable, and ecosystem-friendly format for storing API collections.

As part of this transition:

* The `.bru` format is now deprecated
* Existing `.bru` collections will continue to work
* We plan to support the format for at least the next 12 months
* New features will continue to work in both BRU and YAML during the transition
* A guided in-app migration flow is available to help you move your collections

You can migrate at your own pace without disrupting your existing workflows.

[Read Docs →](https://link.usebruno.com/docs/opencollection)

### CLI Improvements

The Bruno CLI now supports the redesigned Secret Manager, including native integrations with:

* AWS Secrets Manager
* Azure Key Vault
* HashiCorp Vault

This release also includes JUnit reporting fixes and improved support for YAML-based gRPC collections.

[Read Docs →](https://link.usebruno.com/docs/cli)

### Quality Improvements Across Bruno

Bruno v4.0.0 also includes dozens of fixes and workflow improvements across the Desktop app, CLI, API Docs, imports, and the wider Bruno ecosystem.

Highlights include:

* Better path parameter handling
* Improved Postman import fidelity
* UI and usability improvements throughout the application
* Documentation rendering fixes
* Improved performance and stability
* Bug fixes across Desktop, CLI, and API Docs

---

For the complete list of changes, see the [Release changelog](https://www.usebruno.com/changelog).
