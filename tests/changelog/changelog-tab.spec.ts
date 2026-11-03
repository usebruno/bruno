import path from 'path';
import fs from 'fs';
import { ElectronApplication } from '@playwright/test';
import { test, expect, closeElectronApp } from '../../playwright';
import { waitForReadyPage } from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

const initUserDataFresh = path.join(__dirname, 'init-user-data-fresh');
const initUserDataExisting = path.join(__dirname, 'init-user-data-existing');
const initUserDataCurrent = path.join(__dirname, 'init-user-data-current');

// app.getVersion() reads from bruno-electron's package.json — match that here
const currentVersion = require('../../packages/bruno-electron/package.json').version;

test.describe('Changelog ("What\'s New") Tab', () => {
  test('should NOT show the changelog tab to brand-new users', async ({ launchElectronApp }) => {
    let app: ElectronApplication | undefined;

    try {
      app = await launchElectronApp({ initUserDataPath: initUserDataFresh });
      const page = await waitForReadyPage(app);
      const locators = buildCommonLocators(page);

      // New users see the welcome modal — that's the established flow.
      await expect(page.getByTestId('welcome-modal')).toBeVisible();

      // The changelog tab must not appear alongside it.
      await expect(locators.tabs.requestTab('What\'s New')).toHaveCount(0);
    } finally {
      if (app) {
        await closeElectronApp(app);
      }
    }
  });

  test('should show the changelog tab for existing users upgrading to a new version', async ({ launchElectronApp }) => {
    let app: ElectronApplication | undefined;

    try {
      app = await launchElectronApp({ initUserDataPath: initUserDataExisting });
      const page = await waitForReadyPage(app);
      const locators = buildCommonLocators(page);

      // Tab appears in the active workspace's tab strip and becomes active.
      await expect(locators.tabs.requestTab('What\'s New')).toHaveCount(1, { timeout: 15000 });
      await expect(locators.tabs.activeRequestTab()).toContainText('What\'s New');

      // Welcome modal must NOT show — this user already onboarded.
      await expect(page.getByTestId('welcome-modal')).not.toBeVisible();

      // Content sanity: header + a piece of the bundled markdown.
      await expect(page.getByText('What\'s New in Bruno')).toBeVisible();
    } finally {
      if (app) {
        await closeElectronApp(app);
      }
    }
  });

  test('should NOT show the changelog tab when lastSeenVersion matches the current version', async ({ launchElectronApp }) => {
    let app: ElectronApplication | undefined;

    try {
      app = await launchElectronApp({
        initUserDataPath: initUserDataCurrent,
        templateVars: { currentVersion }
      });
      const page = await waitForReadyPage(app);
      const locators = buildCommonLocators(page);

      // Give the hook time to run — snapshotReady + activeWorkspace must both settle.
      await page.waitForTimeout(2000);

      await expect(locators.tabs.requestTab('What\'s New')).toHaveCount(0);
    } finally {
      if (app) {
        await closeElectronApp(app);
      }
    }
  });

  test('should persist lastSeenVersion on open and not re-open on next launch', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('changelog-persist');
    let app: ElectronApplication | undefined;

    try {
      app = await launchElectronApp({ userDataPath, initUserDataPath: initUserDataExisting });
      let page = await waitForReadyPage(app);
      let locators = buildCommonLocators(page);

      await expect(locators.tabs.requestTab('What\'s New')).toHaveCount(1, { timeout: 15000 });

      // The hook saves lastSeenVersion right after addTab. Poll the prefs file
      // until the write lands — electron-store writes synchronously, but the
      // dispatch chain is async.
      await expect.poll(
        async () => {
          try {
            const prefs = JSON.parse(await fs.promises.readFile(path.join(userDataPath, 'preferences.json'), 'utf8'));
            return prefs.preferences?.onboarding?.lastSeenVersion;
          } catch {
            return null;
          }
        },
        { timeout: 10000 }
      ).toBe(currentVersion);

      await closeElectronApp(app);
      app = undefined;

      // Restart against the same user data — tab must NOT reappear for this version.
      app = await launchElectronApp({ userDataPath });
      page = await waitForReadyPage(app);
      locators = buildCommonLocators(page);

      // Settle window for snapshot hydration + hook evaluation.
      await page.waitForTimeout(2000);

      await expect(locators.tabs.requestTab('What\'s New')).toHaveCount(0);
    } finally {
      if (app) {
        await closeElectronApp(app);
      }
    }
  });

  test('should close the changelog tab when the user closes it', async ({ launchElectronApp }) => {
    let app: ElectronApplication | undefined;

    try {
      app = await launchElectronApp({ initUserDataPath: initUserDataExisting });
      const page = await waitForReadyPage(app);
      const locators = buildCommonLocators(page);

      const changelogTab = locators.tabs.requestTab('What\'s New');
      await expect(changelogTab).toHaveCount(1, { timeout: 15000 });

      // Hover to reveal the close button, then click it.
      await changelogTab.hover();
      await page.locator('.request-tab')
        .filter({ hasText: 'What\'s New' })
        .getByTestId('request-tab-close-icon')
        .click();

      await expect(changelogTab).toHaveCount(0);
    } finally {
      if (app) {
        await closeElectronApp(app);
      }
    }
  });
});
