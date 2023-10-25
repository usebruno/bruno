## Vault setup

### What is Vault?

HashiCorp Vault is an identity-based secrets and encryption management system. It provides encryption services that are gated by authentication and authorization methods to ensure secure, auditable and restricted access to secrets. It is used to secure, store and protect secrets and other sensitive data using a UI, CLI, or HTTP API.

[More informations](https://developer.hashicorp.com/vault/docs/what-is-vault)

Vault integration in Bruno lets you use your Vault KV _(key/value)_ secrets in your requests by using the following format :

```
{{vault|path|jsonPath}}
```

### Setup Vault locally

Vault can be installed locally for development purposes. This is not needed for production environments as Vault should be installed on a real server.

#### Install Vault on your OS

Follow the [instructions to install Vault CLI on your operating system](https://developer.hashicorp.com/vault/downloads).

#### Run Vault with Docker

Run vault in server mode locally (https://registry.hub.docker.com/_/vault/). This makes Vault available on port 8200.

```bash
docker run --cap-add=IPC_LOCK -e 'VAULT_LOCAL_CONFIG={"storage": {"file": {"path": "/vault/file"}}, "listener": [{"tcp": { "address": "0.0.0.0:8200", "tls_disable": true}}], "default_lease_ttl": "168h", "max_lease_ttl": "720h", "ui": true}' -p 8200:8200 vault:1.13.3 server
```

#### Setup your Vault with the UI

Visit http://localhost:8200/ to access the Vault UI and :

- Setup the initial root keys and store them somewhere.
- Unseal using the key you just generated.
- Login with the root token.
- Enable new engine.
- Select "KV (Key/Value)".
- Set the path (`bruno` for example) and save.

#### Add a new secret

- Create a new secret
- Set the path (`supersecret` for example), data, and save

```json Example data
{
  "config": {
    "word": "my secret"
  }
}
```

The path for this secret will be `bruno/data/supersecret`.

## Bruno setup

You now need to login and configure Bruno to enable the Vault integration:

```bash
# Running this command will create your token file at ~/.vault-token
vault login -address=http://localhost:8200 -method=token token=root_token_here
```

Configure your environment variables :

- `VAULT_ADDR`: http://localhost:8200
- `VAULT_TOKEN_FILE_PATH`: /home/username/.vault-token
- `VAULT_PATH_PREFIX`: /bruno/data/

### Use Vault variables in Bruno

You can now use your Vault variables in Bruno using the following format :

```
{{vault|path|jsonPath}}
```

- `path`: the path of your secret in Vault. Be careful to include /data/ in the path.
- `jsonPath`: the path of the value you want to use in your secret.

Example :

To get the value "my secret" from bruno/data/supersecret

```
{{vault|bruno/data/supersecret|config.word}}
```

## Known issues

- Vault variables cannot be used in pre-request and post-request scripts
