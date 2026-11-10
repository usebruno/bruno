## What's New in Bruno v4.4.0

### 1Password Secret Manager

Bruno now reads secrets from 1Password through the 1Password Connect server. Add a 1Password account in the Secret Manager, pick the vaults to expose, and reference secrets with the same `{{secret.}}` syntax used by Doppler, Infisical and HashiCorp Vault.

![1Password account set up](https://d3icksk7srk4uh.cloudfront.net/4.4.0/1pass.png)

### OpenAPI Sync and the API Spec Panel

* **Connect to an existing spec.** A collection can be linked to a spec that is already in the workspace, without re-importing it.
* **Choose how requests are named.** Pick summary, operationId, description or path when importing or syncing.
* **Bulk Import: Check for Spec Updates.** The Bulk Import modal shows which specs have changes since the last sync.
* **Spec item actions.** Right-click an item in the API Spec panel to generate, reveal, rename, clone or delete.

![Spec item context menu](https://d3icksk7srk4uh.cloudfront.net/4.4.0/mock-server.png)

### Smarter Variable Autocomplete

* **Scope-aware ranking.** OAuth2 credentials are ranked below dynamic variables, and process-env entries stay in the list until explicitly dismissed.
* **Readable suggestions.** Long variable names are no longer truncated, and the suggestion no longer deletes text after the cursor.
* **Save as secret, inline.** When a sensitive value is detected in a credential field, Bruno offers to save it as a secret variable from the warning tooltip, in one click.

![Save a sensitive value as a secret from the warning tooltip](https://d3icksk7srk4uh.cloudfront.net/4.4.0/secret-values.png)

### Environment Sidebar

* **Multi-select and bulk actions.** Select multiple environments in a collection or global sidebar with the standard shortcuts, then duplicate, delete or move them in one step.
* **Create from search.** When a search returns no results, the sidebar offers to create an environment with that name.

![Environment Multi-select bulk actions](https://d3icksk7srk4uh.cloudfront.net/4.4.0/export-env.png)

### Collection Runner at Scale

The runner no longer freezes the app when started with high iteration counts. The Include and Exclude tag filters have been reworked so they read as a single list, and folder-level tags are matched the same way as request tags.

![Collection Runner Include and Exclude tag](https://d3icksk7srk4uh.cloudfront.net/4.4.0/collection-runner.png)

### Mock Servers

* **CORS preflight accepts custom headers.** Browser flows that rely on header-based routing now reach the mock.
* **No lost edits.** Unsaved mock-response edits survive a tab switch, and Edit mode is kept until the user saves or discards.
* **Disabled means read-only.** Disabling a mock server also disables editing of its responses.
* **Create from Spec, validated.** The dialog rejects invalid files and produces complete bodies for valid Swagger 2.0 specs.


### Git

GitHub SAML SSO failures on push and pull now show the actual error from GitHub and a link to authorise the token, imports no longer fail when the repository contains a very long file path, and the "Pull from other branches" modal uses consistent CTAs.

---

For the complete list of changes, see the [Release changelog](https://www.usebruno.com/changelog).
