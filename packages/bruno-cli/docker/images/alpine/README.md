# Bruno CLI — Alpine

Alpine Linux variant of the Bruno CLI Docker image.

**Base image:** `node:22-alpine`

## Building

```bash
docker build -t usebruno/cli:alpine ./images/alpine

# with specific Bruno CLI version
docker build \
  --build-arg BRUNO_VERSION=3.3.0 \
  -t usebruno/cli:3.3.0-alpine \
  ./images/alpine
```

## Usage

```bash
# Run a collection
docker run --rm -v $(pwd):/bruno usebruno/cli:alpine run --env staging

# with pinned version
docker run --rm -v $(pwd):/bruno usebruno/cli:3.3.0-alpine run --env staging
```
