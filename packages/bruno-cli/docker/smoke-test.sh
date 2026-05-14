#!/bin/sh
# Smoke tests for Bruno CLI Docker image
# Usage: ./smoke-test.sh <image> [collection-abs-path] [run-target] [env-name]
# Examples:
#   ./smoke-test.sh usebruno/cli:alpine
#   ./smoke-test.sh usebruno/cli:alpine /abs/path/to/collection echo Prod

set -e

IMAGE=$1
COLLECTION_PATH=$2
RUN_TARGET=${3:-.}
COLLECTION_ENV=$4

if [ -z "$IMAGE" ]; then
  echo "Usage: $0 <image> [collection-abs-path] [run-target] [env-name]"
  exit 1
fi

echo "Running smoke tests for image: $IMAGE"
echo "---"

# Test 1 - bru is installed and returns a version
echo "Test 1: bru --version"
VERSION=$(docker run --rm "$IMAGE" --version)
echo "  → $VERSION"
if [ -z "$VERSION" ]; then
  echo "  FAIL: no version output"
  exit 1
fi
echo "  PASS"

# Test 2 - container runs as non-root user "node"
echo "Test 2: non-root user"
USER=$(docker run --rm --entrypoint whoami "$IMAGE")
echo "  → $USER"
if [ "$USER" != "node" ]; then
  echo "  FAIL: expected 'node', got '$USER'"
  exit 1
fi
echo "  PASS"

# Test 3 - working directory is /bruno
echo "Test 3: working directory"
DIR=$(docker run --rm --entrypoint pwd "$IMAGE")
echo "  → $DIR"
if [ "$DIR" != "/bruno" ]; then
  echo "  FAIL: expected '/bruno', got '$DIR'"
  exit 1
fi
echo "  PASS"

# Test 4 - bru help works
echo "Test 4: bru --help"
docker run --rm "$IMAGE" --help > /dev/null
echo "  PASS"

# Test 5 (optional) - run an actual Bruno collection
#
# Engine-vs-content semantics:
#   This test validates that bru can execute a collection end-to-end
#   (parser, request layer, JS sandbox, assertion engine, summary output).
#   It does NOT require every test/assertion in the collection to pass.
#
#   Success: bru reaches the run summary AND at least 1 request passed.
#   Failure: bru did not emit a summary (engine broken) OR every request failed
#            (suggests image-level breakage rather than incidental test flakes).
#
#   Any individual test/request failures are surfaced as warnings (full bru
#   output kept above for trace) so the team can investigate without blocking
#   the publish.
if [ -n "$COLLECTION_PATH" ]; then
  if [ ! -d "$COLLECTION_PATH" ]; then
    echo "Test 5: FAIL - collection path not found: $COLLECTION_PATH"
    exit 1
  fi
  # Build the optional --env argument as positional params so it remains
  # properly quoted when passed to docker run (avoids word-splitting issues
  # if COLLECTION_ENV ever contains spaces or special characters).
  set --
  if [ -n "$COLLECTION_ENV" ]; then
    set -- --env "$COLLECTION_ENV"
  fi
  echo "Test 5: bru run $RUN_TARGET${COLLECTION_ENV:+ --env $COLLECTION_ENV}"
  echo "----- bru run output -----"

  set +e
  OUTPUT=$(docker run --rm \
    -v "$COLLECTION_PATH:/bruno" \
    "$IMAGE" \
    run "$RUN_TARGET" "$@" 2>&1)
  EXIT=$?
  set -e

  echo "$OUTPUT"
  echo "----- bru run output end (exit=$EXIT) -----"

  # Locate bru's end-of-run summary, supporting both output formats:
  #   New (table):    "Requests      | 14 (12 Passed, 2 Failed)"
  #   Legacy (line):  "Requests: 14, Passed: 12, Failed: 2"
  # Reject ANSI/box-drawing chars by grep'ing for the request-count pattern.
  SUMMARY_REQ=$(echo "$OUTPUT" | grep -E "[0-9]+[[:space:]]+Passed,[[:space:]]+[0-9]+[[:space:]]+Failed" | head -1)
  if [ -z "$SUMMARY_REQ" ]; then
    # Fall back to legacy "Requests: N, Passed: N, Failed: N" form
    SUMMARY_REQ=$(echo "$OUTPUT" | grep -E "Requests:[[:space:]]+[0-9]+,[[:space:]]+Passed:[[:space:]]+[0-9]+,[[:space:]]+Failed:[[:space:]]+[0-9]+" | head -1)
  fi
  if [ -z "$SUMMARY_REQ" ]; then
    echo "  FAIL: bru did not emit a run summary - engine likely crashed"
    exit 1
  fi

  PASSED=$(echo "$SUMMARY_REQ" | grep -oE "([0-9]+[[:space:]]+Passed|Passed:[[:space:]]+[0-9]+)" | head -1 | grep -oE "[0-9]+")
  FAILED=$(echo "$SUMMARY_REQ" | grep -oE "([0-9]+[[:space:]]+Failed|Failed:[[:space:]]+[0-9]+)" | head -1 | grep -oE "[0-9]+")
  PASSED=${PASSED:-0}
  FAILED=${FAILED:-0}
  echo "  Summary: $SUMMARY_REQ"

  if [ "$PASSED" -ge 1 ]; then
    if [ "$FAILED" -gt 0 ]; then
      echo "  PASS (with warnings: $FAILED request(s) failed - see output above for details)"
      # Surface as a GitHub Actions warning annotation when run in CI
      echo "::warning::Smoke Test 5 ($IMAGE): $FAILED request(s) failed in collection '$RUN_TARGET' env=$COLLECTION_ENV. $PASSED passed. Image marked OK. Review bru output in this job's log."
    else
      echo "  PASS (all $PASSED request(s) passed)"
    fi
  else
    echo "  FAIL: 0 requests passed (Passed=$PASSED, Failed=$FAILED) - check image and network"
    exit 1
  fi
fi

echo "---"
echo "All smoke tests passed for $IMAGE"
