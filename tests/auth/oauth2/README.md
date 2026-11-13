# OAuth2 e2e tests

The `oauth2` Playwright project drives real OAuth2 flows against a local Keycloak instance,
so Keycloak must be running before the specs start.

## What the specs expect

- Keycloak reachable at `http://127.0.0.1:8090`
- The `bruno` realm imported from `fixtures/keycloak/realm-export.json`

CI provisions this through `.github/actions/auth/oauth2/setup-keycloak` and
`.github/actions/auth/oauth2/run-oauth2-e2e-tests`; keep the local setup below in step with them.

## Running locally

Start Keycloak with the fixture realm imported:

```bash
docker run -d --name bruno-keycloak -p 8090:8080 \
  -v "$PWD/tests/auth/oauth2/fixtures/keycloak/realm-export.json:/opt/keycloak/data/import/realm-export.json:ro" \
  quay.io/keycloak/keycloak:26.3.3 start-dev --http-port=8080 --import-realm
```

Wait until `http://127.0.0.1:8090/realms/bruno` responds, then run the suite:

```bash
npm run test:e2e:auth:oauth2
```

Stop and remove the container when you are done:

```bash
docker rm -f bruno-keycloak
```
