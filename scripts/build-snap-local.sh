#!/bin/bash
#
# Build a Bruno snap locally on an Ubuntu host.
#
# electron-builder 24 defaults to the core20 base and runs `snapcraft snap`;
# Snapcraft 9 dropped both. On Snapcraft >= 9 this script overrides the base to
# match the host (no config file edits) and packs the generated snap project
# itself with `snapcraft pack --destructive-mode`.
#
# Usage: ./scripts/build-snap-local.sh [--skip-web]
#   --skip-web   reuse the existing packages/bruno-app/dist build
#   SNAP_BASE=core22 ./scripts/build-snap-local.sh   force a base

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ELECTRON_DIR="$ROOT_DIR/packages/bruno-electron"
SKIP_WEB=false

for arg in "$@"; do
  case "$arg" in
    --skip-web) SKIP_WEB=true ;;
    *) echo "Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

command -v snapcraft > /dev/null || { echo "snapcraft is not installed (sudo snap install snapcraft --classic)" >&2; exit 1; }

SNAPCRAFT_MAJOR="$(snapcraft --version | awk '{print $2}' | cut -d. -f1)"

# Destructive mode builds on the host, so the base must match the host release
if [ -z "${SNAP_BASE:-}" ]; then
  . /etc/os-release
  case "$VERSION_ID" in
    20.04) SNAP_BASE=core20 ;;
    22.04) SNAP_BASE=core22 ;;
    24.04) SNAP_BASE=core24 ;;
    *) echo "Unsupported host $PRETTY_NAME; set SNAP_BASE explicitly" >&2; exit 1 ;;
  esac
fi

case "$(uname -m)" in
  x86_64) SNAP_ARCH=amd64 ;;
  aarch64) SNAP_ARCH=arm64 ;;
  *) echo "Unsupported architecture $(uname -m)" >&2; exit 1 ;;
esac

echo "snapcraft $SNAPCRAFT_MAJOR.x, base $SNAP_BASE, arch $SNAP_ARCH"

cd "$ROOT_DIR"

if [ "$SKIP_WEB" = false ]; then
  npm run build:web
fi

[ -d packages/bruno-app/dist ] || { echo "packages/bruno-app/dist is missing; run without --skip-web" >&2; exit 1; }

# Same web staging as scripts/build-electron.sh
rm -rf "$ELECTRON_DIR/out" "$ELECTRON_DIR/web"
mkdir "$ELECTRON_DIR/web"
cp -r packages/bruno-app/dist/* "$ELECTRON_DIR/web"
sed -i'' -e 's@/static/@static/@g' "$ELECTRON_DIR"/web/**.html
sed -i'' -e 's@/static/font@../../static/font@g' "$ELECTRON_DIR"/web/static/css/**.**.css
find "$ELECTRON_DIR/web" -name '*.map' -type f -delete

# Wrap the real config so the base override never touches the tracked file
TMP_CONFIG="$(mktemp --suffix=.js)"
trap 'rm -f "$TMP_CONFIG"' EXIT
cat > "$TMP_CONFIG" << EOF
const config = require('$ELECTRON_DIR/electron-builder-config.js');
module.exports = { ...config, snap: { ...config.snap, base: '$SNAP_BASE' } };
EOF

cd "$ELECTRON_DIR"

if [ "$SNAPCRAFT_MAJOR" -lt 9 ]; then
  npx electron-builder --linux snap --config "$TMP_CONFIG"
else
  # Fails at `snapcraft snap`, but only after generating the snap project
  npx electron-builder --linux snap --config "$TMP_CONFIG" || true

  SNAP_PROJECT="$ELECTRON_DIR/out/__snap-$SNAP_ARCH"
  [ -f "$SNAP_PROJECT/snap/snapcraft.yaml" ] || { echo "electron-builder did not generate $SNAP_PROJECT" >&2; exit 1; }

  VERSION="$(node -p "require('./package.json').version")"
  (cd "$SNAP_PROJECT" && snapcraft pack --destructive-mode --output "../bruno_${VERSION}_${SNAP_ARCH}_linux.snap" < /dev/null)
fi

SNAP_FILE="$(ls "$ELECTRON_DIR"/out/*.snap)"
echo
echo "Built $SNAP_FILE"
echo "Install: sudo snap install --dangerous $SNAP_FILE"
