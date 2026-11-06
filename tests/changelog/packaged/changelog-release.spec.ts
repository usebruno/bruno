import { test as base, expect, _electron, ElectronApplication, Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import semver from 'semver';
import { closeElectronApp, waitForReadyPage } from '../../../playwright';

const expectedVersion = process.env.BRUNO_EXPECTED_VERSION || require('../../../packages/bruno-electron/package.json').version;
// A stable baseline exercises the saved-version upgrade gate on every release.
// Set BRUNO_PREVIOUS_VERSION to reproduce a particular previous release.
const previousVersion = process.env.BRUNO_PREVIOUS_VERSION || '0.0.0';
if (!semver.valid(expectedVersion) || !semver.valid(previousVersion) || !semver.lt(previousVersion, expectedVersion)) {
  throw new Error('BRUNO_PREVIOUS_VERSION must be a valid version below BRUNO_EXPECTED_VERSION.');
}

type Fixtures = {
  profilePath: string;
  seedPreferences: (version: string | null, fresh?: boolean) => Promise<void>;
  launchPackagedApp: () => Promise<{ app: ElectronApplication; page: Page }>;
};

const test = base.extend<Fixtures>({
  profilePath: async ({}, use, testInfo) => {
    const profilePath = testInfo.outputPath('user-data');
    await fs.mkdir(profilePath, { recursive: true });
    await use(profilePath);
  },
  seedPreferences: async ({ profilePath }, use) => {
    await use(async (version, fresh = false) => {
      await fs.writeFile(path.join(profilePath, 'preferences.json'), JSON.stringify({
        preferences: {
          general: { defaultLocation: path.join(profilePath, 'collections') },
          ai: { enabled: false },
          onboarding: {
            hasLaunchedBefore: !fresh,
            hasSeenWelcomeModal: !fresh,
            lastSeenVersion: version
          }
        }
      }, null, 2));
    });
  },
  launchPackagedApp: async ({ profilePath }, use, testInfo) => {
    const apps: ElectronApplication[] = [];
    const closedApps = new Set<ElectronApplication>();
    await use(async () => {
      const app = await _electron.launch({
        executablePath: process.env.BRUNO_EXECUTABLE_PATH!,
        args: ['--disable-gpu'],
        timeout: 45000,
        env: {
          ...process.env,
          ELECTRON_IS_DEV: '0',
          ELECTRON_USER_DATA_PATH: profilePath,
          PLAYWRIGHT: 'true',
          DISABLE_SINGLE_INSTANCE: 'true',
          DISABLE_SAMPLE_COLLECTION_IMPORT: 'true'
        }
      });
      apps.push(app);
      app.on('close', () => closedApps.add(app));
      await app.context().tracing.start({ screenshots: true, snapshots: true, sources: true });
      const runtime = await app.evaluate(({ app }) => ({
        packaged: app.isPackaged,
        version: app.getVersion(),
        profilePath: app.getPath('userData')
      }));
      expect(runtime.packaged, 'Must test a packaged app').toBe(true);
      expect(path.resolve(runtime.profilePath), 'App must use the isolated test profile').toBe(path.resolve(profilePath));
      expect(runtime.version, 'Executable must match the release under test').toBe(expectedVersion);
      return { app, page: await waitForReadyPage(app) };
    });
    for (let index = 0; index < apps.length; index++) {
      const app = apps[index];
      if (!closedApps.has(app)) {
        if (testInfo.status !== testInfo.expectedStatus) {
          for (const page of app.windows()) {
            const screenshot = await page.screenshot().catch(() => null);
            if (screenshot) await testInfo.attach(`failure-${index}`, { body: screenshot, contentType: 'image/png' });
          }
        }
        const tracePath = testInfo.outputPath(`launch-${index}-trace.zip`);
        await app.context().tracing.stop({ path: tracePath }).catch(() => {});
        if (await fs.access(tracePath).then(() => true).catch(() => false)) {
          await testInfo.attach('trace', { path: tracePath, contentType: 'application/zip' });
        }
        await closeElectronApp(app);
      }
    }
  }
});

const changelogTab = (page: Page) => page.locator('.request-tab').filter({ hasText: 'What\'s New' });
const savedVersion = async (profilePath: string) => {
  const preferences = JSON.parse(await fs.readFile(path.join(profilePath, 'preferences.json'), 'utf8'));
  return preferences.preferences?.onboarding?.lastSeenVersion;
};

test('upgrade opens changelog once and persists the current version', async ({ seedPreferences, launchPackagedApp, profilePath }, testInfo) => {
  await seedPreferences(previousVersion);
  const { app, page } = await launchPackagedApp();
  await expect(changelogTab(page)).toHaveCount(1);
  await expect(page.locator('.request-tab.active')).toContainText('What\'s New');
  await expect(page.getByTestId('welcome-modal')).not.toBeVisible();
  await expect(page.locator('.changelog-body')).toBeVisible();
  await expect.poll(() => savedVersion(profilePath)).toBe(expectedVersion);

  const tracePath = testInfo.outputPath('upgrade-trace.zip');
  await app.context().tracing.stop({ path: tracePath });
  await testInfo.attach('trace', { path: tracePath, contentType: 'application/zip' });
  await closeElectronApp(app);
  const { page: restartedPage } = await launchPackagedApp();
  // Absence alone can pass before the startup hook runs. Observe the settled UI.
  await restartedPage.waitForTimeout(2000);
  await expect(changelogTab(restartedPage)).toHaveCount(0);
});

test('bundled changelog describes the release under test', async ({ seedPreferences, launchPackagedApp }) => {
  await seedPreferences(previousVersion);
  const { page } = await launchPackagedApp();
  await expect(page.locator('.changelog-body').getByRole('heading', {
    name: `What's New in Bruno v${expectedVersion}`,
    exact: true
  })).toBeVisible();
});

test('same-version launch does not open changelog', async ({ seedPreferences, launchPackagedApp }) => {
  await seedPreferences(expectedVersion);
  const { page } = await launchPackagedApp();
  await page.waitForTimeout(2000);
  await expect(changelogTab(page)).toHaveCount(0);
});

test('new user sees welcome instead of changelog', async ({ seedPreferences, launchPackagedApp, profilePath }) => {
  await seedPreferences(null, true);
  const { page } = await launchPackagedApp();
  await expect(page.getByTestId('welcome-modal')).toBeVisible();
  await expect.poll(() => savedVersion(profilePath)).toBe(expectedVersion);
  await page.waitForTimeout(2000);
  await expect(changelogTab(page)).toHaveCount(0);
});
