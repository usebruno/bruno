## What's New in Bruno v4.2.0

This release expands Bruno across scripting, Git workflows, environments, and migration.

Highlights include **gRPC scripting**, **raising pull requests directly from Bruno**, **environment inheritance**, and stronger **Postman migration compatibility**. It also brings control over runtime headers, sidebar multi-select, lower Runner memory usage, richer reporting, and more capable generated documentation.

Mock Servers, the BRU to YAML migration, Apps and AI, response viewing, and imports all get reliability and usability fixes.

<h3>Scripting for gRPC Requests <span class="badge">Beta</span></h3>

You can now add scripts to gRPC requests across the call lifecycle:

* Before the call starts
* Before each message is sent
* After each message is received
* After the call ends

Scripts read request and response data through `bru.grpc.*`, and `test()` and `expect()` results show up in the Tests tab as usual.

![Scripting for gRPC requests in Bruno](https://d3icksk7srk4uh.cloudfront.net/v4.2.0/grcp-scripting.png)

[Read Docs →](https://link.usebruno.com/docs/grpc-scripting?version=4.2.0)

### Raise Pull Requests Without Leaving Bruno

You can now open a pull request from Bruno after pushing a branch, with the title and description editable inline.

Other Git changes in this release:

* Bruno notifies you when another branch has upstream updates
* Branch names are no longer capped at 50 characters
* Stash Apply, Drop, and Delete errors now show a readable toast
* The Git UI handles 5000+ changed files
* Long paths wrap in the diff view
* Cancelling a credential prompt no longer leaves the operation hanging
* Remotely-deleted branches no longer appear in the pull and push dropdowns

![Opening a pull request from Bruno](https://d3icksk7srk4uh.cloudfront.net/v4.2.0/create-pr.png)

[Read Docs →](https://link.usebruno.com/docs/pull-requests?version=4.2.0)

### Environment Inheritance

An environment can now inherit from another one. Pick a parent from your existing environments and it brings in that environment's variables, so shared values are defined once instead of copied into every environment.

Inherited variables and secrets show up as read-only rows that tell you which environment they came from, and anything you set yourself takes precedence. Chains work too, so STG-GW can inherit from STG, which inherits from your base environment.

![Environment inheritance in Bruno](https://d3icksk7srk4uh.cloudfront.net/v4.2.0/env-inheritance.png)

[Read Docs →](https://link.usebruno.com/docs/environment-inheritance?version=4.2.0)

### Importing Environments

Importing several environment files at once no longer fails as a whole when one of them is bad. Each file is imported on its own. You can also select different environment file formats together.

If an environment you are importing has the same name as one you already have, Bruno asks whether to replace it, import it again, or skip it. This works for both collection and global environments.


### Variable Management

Undefined `{{variables}}` can be created inline from the tooltip with scope selection (global, collection, folder, or request environment), resolving immediately. 

The variables tab itself has been redesigned, so it now looks and behaves like the requests and environments tables. It keeps rows expanded when you switch tabs, and you can copy a value straight from its row.

### Postman Migration Parity

Several real-world import failures are closed out.

* `pm.sendRequest()` promise chains (`.then` / `.catch`) are translated, so async scripts run after import without manual edits
* Legacy `postman.*` global variable APIs map to their Bruno equivalents
* A request with `maxRedirects` above 50 no longer aborts the entire collection
* Environment variables that omit the `enabled` field import correctly

### NTLM Over HTTPS

NTLM requests now honour Bruno's TLS configuration. Servers presenting self-signed or internal-CA certificates authenticate instead of failing with `unable to get local issuer certificate`, either with SSL verification disabled or a matching CA configured. NTLM auth blocks that omit the optional domain field also parse correctly.

This clears a confirmed Postman migration gap that previously had no workaround in Bruno, unblocking corporate and internal services that rely on NTLM over HTTPS.

### Runtime Headers

The headers panel now lists the runtime headers Bruno adds for you (`User-Agent`, `Accept`, `Accept-Encoding`, `Host`, `Connection`) alongside the ones you set on the request, and you can turn any of them off from the UI when a request needs it.

The Timeline and Network tabs and the Runner reports reflect the same headers, including any added or changed by scripts.

[Read Docs →](https://link.usebruno.com/docs/runtime-headers?version=4.2.0)

### Sidebar Multi-Select

You can now pick several items in the sidebar and act on them together: collapse or expand them, or remove and delete them in one go. Cmd/Ctrl + Click adds items one at a time, Shift + Click selects a range, and right-click opens the actions for whatever you have selected.

### Naming Collisions

Duplicate display names are now allowed for collections, folders, and requests. Clone and copy/paste consistently use `<source> copy`, and Bruno resolves filesystem collisions silently with numeric suffixes, so no more toast errors.

### Scripting Reliability

Safe Mode no longer crashes when a script reads a large response body after you restart the app, or when a Post Response variable uses an async expression. CLI runs in Safe Mode now exit properly after `bru.sendRequest()` instead of hanging.

Scripts also behave the way you would expect in a few more places: values you set in `req.onFail()` carry over to later requests, `__dirname` and `__filename` are available in Developer Mode, and async `test()` callbacks are waited for instead of being dropped from your test results.

### Runner Performance

Large collection runs use less memory in the app, and CLI runs are back to the memory footprint they had in 3.0.3.

### Reporting

* JUnit and HTML reporters now represent skipped and bailed requests accurately, so CI tooling can tell what ran, what was skipped, and why
* Iteration-data variables used in Assertion Builder values resolve to their per-iteration value before evaluation
* Runner report download is limited to Ultimate plans, in line with the pricing page

### Response Viewing

* XML responses whose root element is `<error>` render as a collapsible tree instead of crashing the response pane
* Saved Response Examples preserve image and PDF previews
* The elapsed-time counter survives navigating away from and back to an in-progress streaming request
* Click a URL in a response to open it as a new request in the collection.

### Mock Servers

Mock Servers gets a round of fixes.

* Mock Servers is on by default, and can still be turned off under Preferences > Beta
* Creating a mock server from a collection or API spec generates its routes right away, instead of needing a separate Sync
* The Create modal offers Collection, API spec, and Standalone as explicit choices
* Port accepts 1–65535 and shows a proper validation error
* Delay (ms) is locked while the server is running
* Query Parameters opens with its Name and Value columns visible
* Servers without responses are no longer indented under the server above them
* Mock Servers links to its documentation

### BRU to YAML Migration Hardening

Unsaved changes are now preserved through the migration rather than silently discarded. Closing the app mid-migration leaves a recoverable state with the Migrate CTA visible on restart, and migrated collections keep `bru.runRequest()` working.

### Apps and AI

* The Apps entry surfaces consistently in the collection sidebar rather than behind an overflow menu, and opening the collection-level Apps view no longer auto-creates a placeholder App. New collections get a short description, a Learn more button, and a Create App action.
* The chat sidebar, ghost text, Generate popovers, and AI Preferences all look and behave the same now. Scrolling during generation is fixed, and JS snippets no longer sneak into script autocomplete suggestions.

### Collection Docs

Generated documentation now covers far more of what Bruno can do.

* **More request types.** Read-only pages render GraphQL and gRPC requests with their schema, messages, and metadata. Previously this was HTTP only.
* **Playground authentication parity.** The Playground now supports Digest Auth.
* **Playground scripting parity.** A wider safe-mode `bru.*` API and the bundled desktop script library set mean pre-request and post-response scripts behave much closer to how they do in the app.
* **Authoring and sharing.** Tag filters exclude requests from generated docs and drive docs search, code snippets are available directly from examples and from the Playground URL bar, and Try it loads an example into the Playground in one click.
* **Docs from the CLI.** `bru docs generate` produces the HTML documentation from the command line, so docs can be built in CI and published automatically.

---

For the complete list of changes, see the [Release changelog](https://www.usebruno.com/changelog).
