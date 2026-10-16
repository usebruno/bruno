# Changelog release checks

Run the source regression suite during development:

```powershell
npx playwright test tests/changelog/changelog-tab.spec.ts --project=default --workers=1
```

For a release candidate, build and test the packaged application. Install dependencies
and build the shared libraries first, as described in the Playwright testing guide.
From the repository root on Windows:

```powershell
npm run build:web
npm run build:electron -- --dir
$env:BRUNO_EXECUTABLE_PATH = (Resolve-Path 'packages/bruno-electron/out/win-unpacked/Bruno.exe').Path
npm run test:release:changelog
```

The executable must contain the packaged Playwright profile support introduced with
this test suite. Use the application executable, not an installer. This config
starts no development web server and uses a new profile and collection location
inside each test's output directory. The application profile override is enabled
when `PLAYWRIGHT=true`, before Electron stores are imported.

The four tests check upgrade launch, active changelog tab, saved version, restart
without reopening the tab, bundled release heading, same-version launch, and fresh
user welcome behavior. The heading must be `What's New in Bruno v<VERSION>`.
The expected version defaults to `packages/bruno-electron/package.json`.
For an executable built elsewhere, set `BRUNO_EXPECTED_VERSION` explicitly.

By default the upgrade profile uses `0.0.0`, a synthetic older version that requires
no edits between releases. To reproduce a specific previous release:

```powershell
$env:BRUNO_PREVIOUS_VERSION = '4.2.0'
$env:BRUNO_EXPECTED_VERSION = '4.2.1'
npm run test:release:changelog
```

The previous version must be valid semver and lower than the expected version.
This checks the saved-version startup behavior; it does not install an old build
or test the updater or installer.

The `Changelog Release Smoke (Windows)` GitHub Actions workflow builds an unpacked
unsigned Windows app and runs the checks on pushes to `release/v*`, or manually with an
optional previous-version input. Reports, launch traces, failure screenshots, and
saved test preferences are uploaded as evidence. Open the local report with:

```powershell
npx playwright show-report playwright-report/release-changelog
```

When integrating into a separate release pipeline, run the same test command
against its packaged executable before publishing. Configure the smoke job as a
required check in repository settings to enforce a release gate.
