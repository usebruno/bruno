#!/bin/sh
# Smoke tests for Bruno CLI Docker image
# Usage: ./smoke-test.sh <image>
# Example: ./smoke-test.sh usebruno/cli:alpine

set -e

IMAGE=$1

if [ -z "$IMAGE" ]; then
  echo "Usage: $0 <image>"
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

echo "---"
echo "All smoke tests passed for $IMAGE"
