#!/usr/bin/env bash
# before_build_script: installs nvm to /nvm and a sourceable /profile that
# install.sh re-sources. Idempotent.

set -xEeuo pipefail

# node-gyp (used if electron-builder rebuilds a native module) needs a modern
# python3; symlink the newest into /usr/local/bin (outranks /usr/bin) without
# touching the system interpreter distro tools depend on.
mkdir -p /usr/local/bin
for py in /usr/bin/python3.13 /usr/bin/python3.12 /usr/bin/python3.11 /usr/bin/python3.10 /usr/bin/python3.9; do
  if [ -x "$py" ]; then
    ln -sf "$py" /usr/local/bin/python3
    break
  fi
done

export NVM_DIR=/nvm
export PROFILE=/profile
mkdir -p "$NVM_DIR"
touch "$PROFILE"

if [ -s "$NVM_DIR/nvm.sh" ]; then
  exit 0
fi

# Prefer curl: installing wget/curl on openSUSE Tumbleweed upgrades libcurl to a
# broken HTTP/3 build that kills zypper. The base image's curl already works.
if command -v curl >/dev/null 2>&1; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash
else
  wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash
fi
source "$PROFILE"
nvm --version
