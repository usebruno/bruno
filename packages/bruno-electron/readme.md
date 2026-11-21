# bruno-electron

```bash
# electron dev
npm start

# generate pfx file for signing windows build
openssl pkcs12 -export -inkey sectigo.key -in sectigo.pem -out sectigo.pfx
```

## macOS app icon

The macOS icon ships in two formats:

| File | Used by |
| ---- | ------- |
| `resources/icons/mac/icon.icns` | macOS 15 (Sequoia) and older |
| `resources/icons/mac/Assets.car` | macOS 26 and newer (light, dark and tinted variants) |

`Assets.car` is compiled from the Icon Composer source at
`resources/icons/mac/icon.icon` and is committed so that building Bruno does not
require Xcode. After editing the source in Icon Composer, regenerate it with
Xcode 26 or newer:

```bash
cd packages/bruno-electron/resources/icons/mac
out=$(mktemp -d)

actool icon.icon --compile "$out" \
  --output-format human-readable-text --notices --warnings --errors \
  --output-partial-info-plist "$out/partial.plist" \
  --app-icon icon --include-all-app-icons \
  --enable-on-demand-resources NO \
  --development-region en --target-device mac \
  --minimum-deployment-target 26.0 --platform macosx

cp "$out/Assets.car" .
rm -rf "$out"
```

Compile into a temporary directory: `actool` also emits an `icon.icns` fallback
that only goes up to 256px, and it would overwrite the hand-made `icon.icns`.
