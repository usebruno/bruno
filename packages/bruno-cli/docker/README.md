# Bruno CLI Docker Images

Official Docker images for [Bruno CLI](https://www.usebruno.com), enabling container-native API collection runs in CI/CD pipelines and local environments without requiring Node.js or npm on the host.

## Image structure

```
docker/
  ├── README.md           ← you are here
  └── images/
      ├── alpine/
      │   ├── Dockerfile  ← Alpine Linux variant (smallest, ~141MB)
      │   └── README.md
      └── debian/
          ├── Dockerfile  ← Debian slim variant (~200MB+, glibc support)
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

| Tag | Example | Variant |
|-----|---------|---------|
| `latest` | `usebruno/cli:latest` | alpine |
| `<version>` | `usebruno/cli:3.3.0` | alpine |
| `<major.minor>` | `usebruno/cli:3.3` | alpine |
| `<major>` | `usebruno/cli:3` | alpine |
| `<version>-alpine` | `usebruno/cli:3.3.0-alpine` | alpine |
| `<version>-debian` | `usebruno/cli:3.3.0-debian` | debian |
| `debian` | `usebruno/cli:debian` | debian |

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

> Mount your collection directory to `/bruno` and pass `bru` arguments directly after the image name.

```bash
# collection at your current directory
docker run --rm -v $(pwd):/bruno usebruno/cli run --env staging

# collection in a subfolder
docker run --rm -v $(pwd):/bruno usebruno/cli run ./api-tests --env staging

# single request file
docker run --rm -v $(pwd):/bruno usebruno/cli run ./api-tests/login.bru --env staging
```

---

### Step 4 — Choose your environment

```bash
docker run --rm -v $(pwd):/bruno usebruno/cli run --env local
docker run --rm -v $(pwd):/bruno usebruno/cli run --env staging
docker run --rm -v $(pwd):/bruno usebruno/cli run --env production
```

---

### Step 5 — Pass variables at runtime

```bash
# override a single variable
docker run --rm \
  -v $(pwd):/bruno \
  usebruno/cli run --env staging --env-var API_KEY=your_key

# override multiple variables
docker run --rm \
  -v $(pwd):/bruno \
  usebruno/cli run --env staging \
  --env-var BASE_URL=https://api.example.com \
  --env-var API_KEY=secret123

# load variables from a file
docker run --rm \
  -v $(pwd):/bruno \
  --env-file .env \
  usebruno/cli run --env staging
```

---

### Step 6 — Save test results

```bash
# JSON report
docker run --rm \
  -v $(pwd):/bruno \
  usebruno/cli run --env staging --output results.json --format json

# JUnit XML report (for CI test reporters)
docker run --rm \
  -v $(pwd):/bruno \
  usebruno/cli run --env staging --output results.xml --format junit
```

---

### Step 7 — Stop on first failure

```bash
docker run --rm -v $(pwd):/bruno usebruno/cli run --env staging --bail
```

---

### Step 8 — Pin the right version

```bash
# exact version — safest for production, no surprise updates
docker run --rm -v $(pwd):/bruno usebruno/cli:3.3.0 run --env staging

# major.minor — gets patch fixes automatically
docker run --rm -v $(pwd):/bruno usebruno/cli:3.3 run --env staging

# latest — always newest, not recommended for production CI
docker run --rm -v $(pwd):/bruno usebruno/cli:latest run --env staging
```

---

### Step 9 — Choose alpine or debian

```bash
# alpine (default) — use this for most cases
docker run --rm -v $(pwd):/bruno usebruno/cli:3.3.0 run --env staging

# debian — use if you hit SSL, glibc, or native module issues
docker run --rm -v $(pwd):/bruno usebruno/cli:3.3.0-debian run --env staging
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

## Image details

All variants include:

- **Entrypoint:** `bru`
- **Working directory:** `/bruno`
- **User:** `node` (UID 1000, non-root)
- **Architectures:** `linux/amd64`, `linux/arm64`

---

## All version × variant combinations

| | Alpine | Debian |
|---|---|---|
| `latest` | `usebruno/cli:latest` | `usebruno/cli:debian` |
| `3` | `usebruno/cli:3` | `usebruno/cli:3-debian` |
| `3.3` | `usebruno/cli:3.3` | `usebruno/cli:3.3-debian` |
| `3.3.0` | `usebruno/cli:3.3.0` | `usebruno/cli:3.3.0-debian` |
| `3.2.0` | `usebruno/cli:3.2.0` | `usebruno/cli:3.2.0-debian` |
