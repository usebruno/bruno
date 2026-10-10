#!/usr/bin/env bash
# Shared by the rpm spec (%install) and deb rules (override_dh_auto_install).
# Runs Bruno's real build, then electron-builder's `--linux dir` target, and
# stages the unpacked Electron tree under /usr/lib/<name>.
#   $1 = staging root (%{buildroot} / $(DESTROOT))
#   $2 = package name (bruno)

set -xEeuo pipefail

BUILDROOT=$1
NAME=$2
LIBDIR="/usr/lib/$NAME"

# nvm.sh, when sourced, reads the current positional params ($1/$2) as its own
# flags and auto-`use`s a node version — aborting under `set -e` before install.
# Pass --no-use and override $@ to skip that.
export NVM_DIR=/nvm
set -- --no-use
source /profile 2>/dev/null || true
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh" --no-use

nvm install      # reads .nvmrc (v22.x)
nvm use
node -v
npm -v

export HUSKY=0                                   # git hooks fail on the .git-stripped tree
export NODE_OPTIONS="--max-old-space-size=8192"  # rsbuild + electron-builder are memory-hungry
export ELECTRON_BUILDER_CACHE="$PWD/.cache/electron-builder"
export electron_config_cache="$PWD/.cache/electron"

# 1. Install workspaces, build sub-packages, bundle JS sandbox libs (setup.js).
npm run setup

# 2. Web app → packages/bruno-app/dist.
npm run build:web

# 3. Assemble bruno-electron/web; rewrite absolute /static paths to relative so
#    they resolve when electron loads ../web/index.html over file://.
#    Mirrors scripts/build-electron.js.
WEB=packages/bruno-electron/web
rm -rf "$WEB"
mkdir -p "$WEB"
cp -r packages/bruno-app/dist/* "$WEB"/
for f in "$WEB"/*.html; do
  [ -e "$f" ] && sed -i 's@/static/@./static/@g' "$f"
done
for f in "$WEB"/static/css/*.css; do
  [ -e "$f" ] && sed -i 's@/static/font@../../static/font@g' "$f"
done
find "$WEB" -name '*.map' -type f -delete

# 4. Unpacked tree only (no AppImage/deb/rpm wrappers); pin executableName so
#    the binary path is deterministic for the symlink below.
( cd packages/bruno-electron && \
  npx --no-install electron-builder --linux dir \
    --config electron-builder-config.js \
    -c.executableName="$NAME" \
    --publish never )

UNPACK=packages/bruno-electron/out/linux-unpacked

# setup.js also installs the arm64 node-pty prebuilt; drop it so rpm doesn't
# generate unsatisfiable cross-arch deps from its ELF.
find "$UNPACK" -path '*node-pty-linux-arm64*' -prune -exec rm -rf {} + 2>/dev/null || true

# 5. Stage. cp -a preserves chrome-sandbox's perms (rpm %attr / deb postinst set
#    the final setuid root).
install -d -m755 "$BUILDROOT$LIBDIR"
cp -a "$UNPACK"/. "$BUILDROOT$LIBDIR/"

install -d -m755 "$BUILDROOT/usr/bin"
ln -sf "$LIBDIR/$NAME" "$BUILDROOT/usr/bin/$NAME"

# %U passes the bruno:// URL through when launched as a scheme handler.
install -d -m755 "$BUILDROOT/usr/share/applications"
cat > "$BUILDROOT/usr/share/applications/$NAME.desktop" <<EOF
[Desktop Entry]
Name=Bruno
GenericName=API Client
Comment=Opensource API Client for Exploring and Testing APIs
Exec=/usr/bin/$NAME %U
Icon=$NAME
Type=Application
StartupNotify=true
StartupWMClass=Bruno
Categories=Development;
MimeType=x-scheme-handler/bruno;
EOF

# Icons → hicolor (Bruno ships 16..1024; 1024 omitted).
for size in 16 24 32 48 64 128 256 512; do
  src="packages/bruno-electron/resources/icons/png/${size}x${size}.png"
  if [ -f "$src" ]; then
    install -d -m755 "$BUILDROOT/usr/share/icons/hicolor/${size}x${size}/apps"
    install -m644 "$src" "$BUILDROOT/usr/share/icons/hicolor/${size}x${size}/apps/$NAME.png"
  fi
done

chown -R root:root "$BUILDROOT$LIBDIR" 2>/dev/null || true
