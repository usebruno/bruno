## What's New in Bruno v4.3.0

### External Secrets Stay in Memory, Never on Disk

External secrets are no longer saved to disk. Bruno fetches them only when a request that uses them is sent, holds them in memory per environment, and clears them when the app is closed or the collection is removed.

Missing secrets, failed fetches, and unselected provider accounts are each flagged when the request is sent.

### Collection Runner

* **Lower memory use.** Large collection runs now use much less memory. Runs with many iterations or large responses finish smoothly.
* **Folder-level tags.** Tags set on a folder apply to every request inside it and work with the runner's Include and Exclude filters.
* **Data file preview.** Long variable names and values are now fully readable, with horizontal scrolling, resizable columns, and sticky headers.

![Folder-level tags](https://d3icksk7srk4uh.cloudfront.net/v4.3.0/folder-tags.png)

### Inherited Auth and Headers, Visible on the Request

A request set to Inherit auth now shows the effective auth read-only, with a link to where it is configured. Headers set at the folder or collection level now appear on the request too.

![Inherited headers](https://d3icksk7srk4uh.cloudfront.net/v4.3.0/inherit-headers.png)

### Try Option in Response Examples

Saved response examples gain a **Try** action. It replays the example's request in a new transient tab.

![Try a saved response example in Bruno](https://d3icksk7srk4uh.cloudfront.net/v4.3.0/try-response-examples.png)

### Git

* **Clone with a branch.** Clone Repository accepts an optional branch.
* **All branches visible.** Imported repos with multiple branches show every branch.
* **Deleted-file conflicts.** Merge conflicts on deleted files can be resolved in the Git UI.
* **`.git` ignored on import and export.** Collection and workspace zips are imported without any `.git` folder, and exports never include one.

![Resolve deleted-file conflicts in Bruno's Git UI](https://d3icksk7srk4uh.cloudfront.net/v4.3.0/delete-conflict-file.png)

### Themes

Three new themes join the theme list: Gruvbox (six variants), Dracula, and Cyberdream.

![Additional dark themes in Bruno](https://d3icksk7srk4uh.cloudfront.net/v4.3.0/additional-themes.png)

---

For the complete list of changes, see the [Release changelog](https://www.usebruno.com/changelog).
