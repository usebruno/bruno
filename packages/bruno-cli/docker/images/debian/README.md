# Bruno CLI — Debian

Debian slim variant of the Bruno CLI Docker image.

**Base image:** `node:22-slim`

## Building

```bash
docker build -t usebruno/cli:debian ./images/debian

# with specific Bruno CLI version
docker build \
  --build-arg BRUNO_VERSION=3.3.0 \
  -t usebruno/cli:3.3.0-debian \
  ./images/debian
```

## Usage

```bash
# Run a collection
docker run --rm -v $(pwd):/bruno usebruno/cli:debian run --env staging

# with pinned version
docker run --rm -v $(pwd):/bruno usebruno/cli:3.3.0-debian run --env staging
```
