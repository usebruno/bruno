# HTTP/2 end-to-end tests

Real end-to-end coverage for Bruno's HTTP/2 support (custom h2 transport + session
pool). A local testbed server speaks HTTP/2, HTTP/1.1, h2c and runs forward/SOCKS
proxies; the Bruno CLI runs the `HTTP2 QA` collection against it in every HTTP-version
mode and asserts the observed protocol and behaviour.

## Layout

- `server/` — zero-dependency Node testbed (`server.js`) plus `gen-certs.sh`, which
  mints a private CA and server/client certificates. `selftest.js` sanity-checks it.
- `fixtures/collections/bru/` — the `HTTP2 QA` Bruno collection, with three
  environments that pair with a CLI flag:
  - `HTTP1.1`      ⇄ `--http-version http1`
  - `HTTP2 forced` ⇄ `--http-version http2`
  - `Auto`         ⇄ `--http-version auto`
  The environment's `mode` variable drives the protocol assertions; the CLI flag drives
  the client. They must match.

## Run it locally

```bash
cd tests/http2/server
./gen-certs.sh                 # writes server/certs (git-ignored)
export NODE_EXTRA_CA_CERTS="$PWD/certs/ca.crt"   # trust the testbed CA (no --insecure)
node server.js &               # listens on :8443 (dual), :8444 (h2-only), proxies, …

cd ../fixtures/collections/bru
BRU=../../../../../packages/bruno-cli/bin/bru.js
node "$BRU" run --env "HTTP2 forced" --http-version http2 --exclude-tags ci-skip
```

Some vhost/proxy tests expect `h2.localhost`, `proxied.localhost` and `virtual.example`
to resolve to loopback. CI adds them to `/etc/hosts`; add them locally if you run the
`ci-skip` tests.

## What CI runs — the `ci-skip` tag

CI runs only requests that pass deterministically and headlessly in all three modes, by
excluding the `ci-skip` tag (`--exclude-tags ci-skip`). Tagged out of CI:

- **Negative / outcome-pattern tests** — requests that fail *by design* (RST_STREAM,
  GOAWAY, timeouts, connection-refused, DNS failure, h2-only under http1, …). These use
  an outcome/verify pattern and are validated in the app and in the `bruno-requests`
  unit specs; in `bru run` an intentional request failure is a non-zero exit, so they are
  excluded from the exit-code-gated CI run.
- **Environment-sensitive tests** — proxy CONNECT/SOCKS and host-vhost cases that need a
  clean network and `/etc/hosts`.
- **Manual tests** — anything named `… - manual` that needs human/interactive setup.

This keeps the CI gate green and meaningful (135 requests × 3 modes, all assertions),
while the full collection stays runnable in the app for the negative/edge coverage.

## CI wiring

`.github/actions/http2/<os>/` provides composite steps `setup-certs`, `start-server`
and `run-cli-tests`; `.github/workflows/tests-linux.yml` wires them into the
`http2-test` job. Phase 1 is Linux CLI E2E; macOS/Windows and the proxy/negative
coverage are follow-ups.
