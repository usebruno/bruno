## What's New in Bruno v4.3.0

Bruno v4.3.0 is a trust and visibility release. Secrets from external managers no longer touch disk, imported zips can no longer carry Git hooks, and the configuration a request inherits from its folder and collection is now visible on the request itself.

Highlights include **external secrets held in memory**, **inherited auth and headers shown on the request**, and **Bruno Apps running from an isolated origin**. It also brings folder-level tags, a whole-run stop in the Collection Runner, a Try action for response examples, Git improvements, and three new themes.

### External Secrets Stay in Memory, Never on Disk

External secrets are no longer saved to disk. Bruno fetches them only when a request that uses them is sent, and holds them in memory for the session, separately for each environment. They are cleared when the app or the collection closes. Only the configuration is saved to disk: the provider, the secret names, and the bindings.



The send flow now explains each failure case:

* **Missing values.** A warning lists them, and the request still sends.
* **Failed fetch.** Nothing is sent, and a Secret Fetch Error links straight to the secret configuration.
* **No provider account selected.** A modal lets you pick or add one before the send continues.

GraphQL and WebSocket requests now resolve external secrets too.

### Collection Runner

* **Folder-level tags.** Tags set on a folder apply to every request inside it, and work with the runner's Include and Exclude filters.
* **Stop the whole run.** `bru.runner.stopExecution()` now halts the entire run across iterations, in both the desktop app and the CLI.
* **Runner storage.** Iteration responses are persisted to queryable storage rather than held in memory, so large multi-iteration runs keep memory flat. This completes the runner memory work started in v4.2.0.

### Try Option in Response Examples

Saved response examples gain a **Try** action. It replays the example's request in a new transient tab, without changing the saved request or the example.

![Try a saved response example in Bruno](https://d3icksk7srk4uh.cloudfront.net/v4.3.0/try-response-examples.png)

### Git

* **Clone with a branch.** Clone Repository accepts an optional branch.
* **Deleted-file conflicts.** Merge conflicts on deleted files can be resolved in the Git UI.
* **All branches visible.** Imported repos with multiple branches show every branch.
* **`.git` ignored on import and export.** Collection and workspace zips are imported without any `.git` folder, including nested ones, and exports never include one. This closes a vector where a shared zip could carry malicious Git hooks.

![Resolve deleted-file conflicts in Bruno's Git UI](https://d3icksk7srk4uh.cloudfront.net/v4.3.0/git-branch-conflicts.png)

### Themes and Polish

* **New themes:** Gruvbox, Dracula, and Cyberdream.
* **Shortcuts.** Sidebar context menu shortcuts are right-aligned, with the proper modifier symbols.
* **Preferences.** The General pane is regrouped into clear sections.
* License keys are masked in License Settings.

![Additional dark themes in Bruno](https://d3icksk7srk4uh.cloudfront.net/v4.3.0/additional-themes.png)

### Bruno Apps

Apps now load from a real isolated origin instead of a `data:` URL. Secure-context browser APIs such as Web Crypto, Clipboard, `localStorage`, and `indexedDB`, and SDKs such as Stripe.js, now work in both request-level and collection Apps.

### Inherited Auth and Headers, Visible on the Request

A request set to Inherit auth now shows the effective auth, read-only, with a link to where it is configured.

The Headers tab gains an **Inherited Headers (n)** section listing headers from parent folders and the collection. Each one links back to its source, so you can see what will actually be sent without opening every parent.

---

For the complete list of changes, see the [Release changelog](https://www.usebruno.com/changelog).
