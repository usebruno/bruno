## Using Vault with Bruno

### What is Vault?

**HashiCorp Vault** is an identity-based secrets and encryption management system. It provides encryption services that are gated by authentication and authorization methods to ensure secure, auditable and restricted access to secrets. It is used to secure, store and protect secrets and other sensitive data using a UI, CLI, or HTTP API.

[More informations](https://developer.hashicorp.com/vault/docs/what-is-vault)

Vault integration in Bruno lets you use your Vault KV _(key/value)_ secrets in your requests by using the following format :

```
{{vault|path|jsonPath}}
```

### Installing Vault

Vault should already be installed on a server to be used with Bruno.
Read the [Vault documentation](https://developer.hashicorp.com/vault/docs) to install Vault on your server if needed.

### Bruno setup

#### Generate a Vault token

```bash
# Creates a token at ~/.vault-token by default
vault login -address=https://vault.domain -method=userpass username=j.doe
```

#### Configure your environment variables in Bruno

You now need to set your environment variables to enable the Vault integration.
This will let Bruno know where your Vault and token are located.

Available environment variables :

- `VAULT_ADDR` **[Required]** The URL where your Vault is located. Example: https://vault.domain
- `VAULT_TOKEN_FILE_PATH` **[Required]** The path to your .vault-token file on your system. Example: /home/j.doe/.vault-token
- `VAULT_PATH_PREFIX` [Optional] A path that will prefix all Vault paths. Example: /bruno/data/customers
- `VAULT_PROXY` [Optional] A proxy to use when fetching data from Vault. Example: https://proxy.domain:3128

### Use Vault variables in Bruno

You can now use your Vault variables in Bruno using the following format :

```
{{vault|path|jsonPath}}
```

- `path`: the path of your secret in Vault. Be careful to include /data/ in the path when using KV v2.
- `jsonPath`: the path of the value you want to use in your secret.

Example :

With the following secret stored at `bruno/data/something/supersecret` :

```json
{
  "config": {
    "word": "super secret"
  }
}
```

To get the value "super secret", you can write :

```
{{vault|bruno/data/something/supersecret|config.word}}
```

You can also set your `VAULT_PATH_PREFIX` to `/bruno/data/something` and write :

```
{{vault|supersecret|config.word}}
```

### Using environment variables in paths

You can also use environment variables in your Vault path or Json path by using the `[env]` notation.

```
{{vault|bruno/data/[env.MY_PATH]|[env.MY_JSON_PATH]}}
```
