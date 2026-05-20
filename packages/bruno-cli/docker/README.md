# Bruno CLI Docker Images

Official Docker images for [Bruno CLI](https://www.usebruno.com), enabling container-native API collection runs in CI/CD pipelines and local environments without requiring Node.js or npm on the host. See the [Bruno CLI docs](https://docs.usebruno.com/bru-cli/overview) for CLI usage.

## Folder structure

```text
docker/
  ├── README.md           ← you are here
  └── images/
      ├── alpine/
      │   ├── Dockerfile  ← Alpine Linux variant (smallest, ~141MB)
      │   └── README.md
      └── debian/
          ├── Dockerfile  ← Debian slim variant (~162MB, glibc support)
          └── README.md
```

---

## Registries

```bash
docker pull usebruno/cli:latest
docker pull ghcr.io/usebruno/cli:latest
```

---

## Variants

| Variant | Base image | Details |
|---------|-----------|---------|
| **Alpine** (default) | `node:22-alpine` | [→ Alpine README](./images/alpine/README.md) |
| **Debian** | `node:22-slim` | [→ Debian README](./images/debian/README.md) |

### Quick choice

- **Use Alpine** unless you have a specific reason not to (90% of users)
- **Use Debian** if you hit SSL/glibc compatibility issues

---

## Tags

Every release publishes the following tags to **both** Docker Hub (`usebruno/cli`) and GHCR (`ghcr.io/usebruno/cli`).

### Alpine variant (default)

| Tag pattern | Example | Notes |
|-------------|---------|-------|
| `latest` | `usebruno/cli:latest` | Newest release marked as latest. Only moves when the publish workflow is run with "Tag this version as latest" checked. |
| `latest-alpine` | `usebruno/cli:latest-alpine` | Alias of `latest` — also alpine. |
| `alpine` | `usebruno/cli:alpine` | Newest alpine, moves on every alpine publish. |
| `<version>` | `usebruno/cli:3.3.0` | Exact version, immutable. |
| `<version>-alpine` | `usebruno/cli:3.3.0-alpine` | Exact version, explicitly alpine. |
| `<major.minor>` | `usebruno/cli:3.3` | Floats with patch releases (3.3.x). |
| `<major.minor>-alpine` | `usebruno/cli:3.3-alpine` | Same, explicitly alpine. |
| `<major>` | `usebruno/cli:3` | Floats with any 3.x.x release. |
| `<major>-alpine` | `usebruno/cli:3-alpine` | Same, explicitly alpine. |

### Debian variant

| Tag pattern | Example | Notes |
|-------------|---------|-------|
| `latest-debian` | `usebruno/cli:latest-debian` | Newest debian release marked as latest (gated by the same checkbox). |
| `debian` | `usebruno/cli:debian` | Newest debian, moves on every debian publish. |
| `<version>-debian` | `usebruno/cli:3.3.0-debian` | Exact version, debian. |
| `<major.minor>-debian` | `usebruno/cli:3.3-debian` | Floats with debian patch releases. |
| `<major>-debian` | `usebruno/cli:3-debian` | Floats with any 3.x.x debian release. |

The unsuffixed tags (`:latest`, `:3.3.0`, `:3.3`, `:3`, `:alpine`) always resolve to the alpine variant by convention.

---

## Step-by-step guide

### Step 1 — Pull the image

```bash
# latest (alpine by default — smallest, fastest to pull)
docker pull usebruno/cli:latest

# specific version (recommended for production CI)
docker pull usebruno/cli:3.3.0

# major.minor — gets patch updates automatically
docker pull usebruno/cli:3.3

# debian variant
docker pull usebruno/cli:debian
docker pull usebruno/cli:3.3.0-debian
```

---

### Step 2 — Check it works

```bash
docker run --rm usebruno/cli --version
```

---

### Step 3 — Run your collection

> These examples assume you are running `docker` from your Bruno collection directory. Mount that directory to `/bruno` and pass `bru` arguments directly after the image name. If your collection lives elsewhere on disk, see the path-based examples further down.
> **Cross-platform note:** the examples below use `$(pwd)` which works in Bash / Zsh / Git Bash / WSL.
> On Windows native shells, substitute `$(pwd)` with:
> - PowerShell: `${PWD}`
> - CMD: `%cd%`
> **Adding `bru` options:** The examples below show docker-specific flags. For all `bru run` options — recurse (`-r`), environments, variables, reporters, bail, and more — see the [Bruno CLI docs](https://docs.usebruno.com/bru-cli/overview).

> **Note on `--rm`:** Examples below omit `--rm`. Docker keeps stopped containers around after they exit, which lets you `docker logs` or `docker inspect` them later for debugging. If you'd rather have Docker auto-delete the container as soon as `bru` finishes — useful for CI runs or to avoid `docker ps -a` filling up with stale entries — append `--rm` to any `docker run` (or `docker compose run`) command:
>
> ```bash
> docker run --rm -v $(pwd):/bruno usebruno/cli run --env staging
> ```
>
> It's purely a cleanup convenience; it doesn't affect the image, mounts, stdout output, or exit code.

```bash
# run every request in the Bruno collection (current dir)
docker run -v $(pwd):/bruno usebruno/cli run --env staging

# run a specific subfolder (group of requests) within that collection
docker run -v $(pwd):/bruno usebruno/cli run ./api-tests --env staging

# run a single .bru request file from that collection
docker run -v $(pwd):/bruno usebruno/cli run ./api-tests/login.bru --env staging

# write a JUnit XML report (lands in the current directory because of the bind mount)
docker run -v $(pwd):/bruno usebruno/cli run --env staging --reporter-junit results.xml
```

For Windows CMD users, swap `$(pwd)` with `%cd%`:

```cmd
docker run -v %cd%:/bruno usebruno/cli run --env staging
```

#### Running a collection that lives at a different path

If your collection is not in your current directory, point `docker` at its path (relative or absolute) instead of `$(pwd)`:

```bash
# run every request in a collection at an arbitrary path
docker run -v /path/to/your/collection:/bruno usebruno/cli run --env staging

# run a single .bru file from a collection at an arbitrary path
docker run -v /path/to/your/collection:/bruno usebruno/cli run ./auth/login.bru --env staging
```

---

### Step 4 — Choose your environment

```bash
docker run -v $(pwd):/bruno usebruno/cli run --env local
docker run -v $(pwd):/bruno usebruno/cli run --env staging
docker run -v $(pwd):/bruno usebruno/cli run --env production
```

---

### Step 5 — Pin the right version

```bash
# exact version — safest for production, no surprise updates
docker run -v $(pwd):/bruno usebruno/cli:3.3.0 run --env staging

# major.minor — gets patch fixes automatically
docker run -v $(pwd):/bruno usebruno/cli:3.3 run --env staging

# latest — always newest, not recommended for production CI
docker run -v $(pwd):/bruno usebruno/cli:latest run --env staging
```

---

### Step 6 — Choose alpine or debian

```bash
# alpine (default) — use this for most cases
docker run -v $(pwd):/bruno usebruno/cli:3.3.0 run --env staging

# alpine — explicitly use the alpine-based image variant
docker run -v $(pwd):/bruno usebruno/cli:3.3.0-alpine run --env staging

# debian — use if you hit SSL, glibc, or native module issues
docker run -v $(pwd):/bruno usebruno/cli:3.3.0-debian run --env staging
```

---

## Usage by variant

### Alpine variant

See [Alpine README](./images/alpine/README.md) for:
- Building the Alpine image
- When to use Alpine
- Variant-specific options

### Debian variant

See [Debian README](./images/debian/README.md) for:
- Building the Debian image
- When to use Debian
- Compatibility notes

---

## CI/CD integration

### GitHub Actions

```yaml
jobs:
  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Bruno collection
        run: |
          docker run --rm \
            -v ${{ github.workspace }}:/bruno \
            usebruno/cli:3.3 run --env staging --output results.xml --format junit

      - name: Publish Test Report
        uses: dorny/test-reporter@v3
        if: always()
        with:
          name: Bruno Test Results
          path: results.xml
          reporter: java-junit
```

### GitLab CI

```yaml
api-tests:
  image: usebruno/cli:3.3
  script:
    - bru run --env staging --output results.xml --format junit
  artifacts:
    reports:
      junit: results.xml
```

---

## Docker Compose

### Quick example

A minimal `docker-compose.yml` for running a Bruno collection alongside your project:

```yaml
services:
  bruno-cli:
    image: usebruno/cli:latest
    container_name: bruno-cli-runner
    volumes:
      - /path/to/collection:/bruno
      - /path/to/reports:/reports
    command:
      run .
      -r
      --env ci
      --reporter-json /reports/results.json
      --reporter-junit /reports/results.xml
      --reporter-html /reports/results.html
```

Then run:

```bash
docker compose run bruno-cli
```

The `/path/to/reports:/reports` mount catches the JSON, JUnit XML, and HTML reports on the host — drop any `--reporter-*` flag to skip that format.

### Try it from this repo

A ready-to-run `docker-compose.yml` lives in this repo at [`packages/bruno-tests/docker-compose.yml`](../../bruno-tests/docker-compose.yml). It mounts the sibling `collection/` directory into the container, runs the `echo` folder against the `Prod` environment, and writes JSON, JUnit XML, and HTML reports into `packages/bruno-tests/reports/`:

```bash
cd packages/bruno-tests
docker compose run bruno-cli
```

This fires a small set of requests against public endpoints that demonstrate the CLI executing requests and assertions inside a container.

### Standalone demo

For a clone-and-run demo with a curated collection, see [`bruno-collections/bruno-cli-docker`](https://github.com/bruno-collections/bruno-cli-docker).

---

## Image details

All variants include:

- **Entrypoint:** `bru`
- **Working directory:** `/bruno`
- **User:** `node` (UID 1000, non-root)
- **Architectures:** `linux/amd64`, `linux/arm64`

