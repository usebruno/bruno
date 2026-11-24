## What's New in Bruno v4.4.0

### Bruno Script API Documentation

Introducing the Bruno Script API documentation at [api-reference.usebruno.com](https://api-reference.usebruno.com/), a complete reference for the `req`, `res` and `bru` objects you use in pre-request scripts, post-response scripts and tests.

![Bruno Script API documentation](https://d3icksk7srk4uh.cloudfront.net/4.4.0/api-ref.png)

### 1Password Secret Manager

Bruno now reads secrets from 1Password through the 1Password Connect server. Add a 1Password account in the Secret Manager, pick the vaults to expose, and reference secrets with the same `{{secret.}}` syntax used by Doppler, Infisical and HashiCorp Vault.

![1Password account set up](https://d3icksk7srk4uh.cloudfront.net/4.4.0/password.png)

### OpenAPI Sync and the API Spec Panel

* **Connect to an existing spec.** A collection can be linked to a spec that is already in the workspace, without re-importing it.
* **Choose how requests are named.** Pick summary, operationId, description or path when importing or syncing.
* **Bulk Import: Check for Spec Updates.** The Bulk Import modal shows which specs have changes since the last sync.
* **Spec item actions.** Right-click an item in the API Spec panel to generate, reveal, rename, clone or delete.

![Spec item context menu](https://d3icksk7srk4uh.cloudfront.net/4.4.0/generate-mock.png)

### Fix Sensitive Data Warnings in One Click

When Bruno warns that a credential field holds a plain-text value or a non-secret variable, you can now save it as a secret directly from the warning.

* Warnings now cover API Key auth, AWS SigV4 session token, and collection proxy password
* Warnings now apply to global, collection, folder, and request variables

![Save a sensitive value as a secret from the warning tooltip](https://d3icksk7srk4uh.cloudfront.net/4.4.0/secret-var-warnings.png)

### Faster Variable Autocomplete

Variable suggestions now appear as soon as you type `{` in the URL bar, params, headers, and auth fields.
You can also open the variable list anywhere with a shortkey

### Environment Sidebar

* **Multi-select and bulk actions.** Select multiple environments in a collection or global sidebar with the standard shortcuts, then duplicate, delete or move them in one step.
* **Create from search.** When a search returns no results, the sidebar offers to create an environment with that name.

![Environment Multi-select bulk actions](https://d3icksk7srk4uh.cloudfront.net/4.4.0/env-multi-select.png)

### Faster Collection Runner Start for Large Runs

The runner view now opens right away when you click **Run** with a high iteration count, instead of freezing before the results table appears.
You can also adjust **Concurrent iterations** in parallel mode to keep large runs smooth on lower-spec systems

![Collection Runner](https://d3icksk7srk4uh.cloudfront.net/4.4.0/runner.png)

### Mock Servers

* **CORS preflight accepts custom headers.** Browser flows that rely on header-based routing now reach the mock.
* **No lost edits.** Unsaved mock-response edits survive a tab switch, and Edit mode is kept until the user saves or discards.
* **Disabled means read-only.** Disabling a mock server also disables editing of its responses.
* **Create from Spec, validated.** The dialog rejects invalid files and produces complete bodies for valid Swagger 2.0 specs.


### Git

GitHub SAML SSO failures on push and pull now show the actual error from GitHub and a link to authorise the token, imports no longer fail when the repository contains a very long file path, and the "Pull from other branches" modal uses consistent CTAs.

---

For the complete list of changes, see the [Release changelog](https://www.usebruno.com/changelog).
