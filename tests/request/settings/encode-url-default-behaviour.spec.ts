import fs from 'fs';
import path from 'path';
import { closeElectronApp, ElectronApplication, expect, test, waitForReadyPage } from '../../../playwright';
import {
  buildCommonLocators,
  selectRequestPaneTab
} from '../../utils/page';

const initUserDataPath = path.join(__dirname, 'init-user-data');
const fixtureCollectionsPath = path.join(__dirname, 'fixtures', 'collections');

type LaunchFixtures = {
  launchElectronApp: (options?: { initUserDataPath?: string; templateVars?: Record<string, string> }) => Promise<ElectronApplication>;
  createTmpDir: (tag?: string) => Promise<string>;
};

const launchWithIsolatedCollections = async ({ launchElectronApp, createTmpDir }: LaunchFixtures) => {
  const collectionPath = await createTmpDir('settings-collections');
  await fs.promises.cp(fixtureCollectionsPath, collectionPath, { recursive: true });
  const app = await launchElectronApp({ initUserDataPath, templateVars: { collectionPath } });
  const page = await waitForReadyPage(app);
  return { app, page, collectionPath };
};

test.describe('Encode URL Setting Tests', () => {
  let app: ElectronApplication;

  test.afterEach(async () => {
    if (app) await closeElectronApp(app);
  });

  test('should reflect encodeUrl true when the key is available', async ({ launchElectronApp, createTmpDir }) => {
    const context = await launchWithIsolatedCollections({ launchElectronApp, createTmpDir });
    app = context.app;
    const page = context.page;
    const locators = buildCommonLocators(page);

    await expect(locators.sidebar.collection('encode-url-test')).toBeVisible();
    await locators.sidebar.collection('encode-url-test').click();
    await locators.sidebar.request('encode-url-true').click();
    await selectRequestPaneTab(page, 'Settings');

    // Expected: Encode URL toggle should be checked because encodeUrl: true is in the bru file
    const encodeUrlToggle = locators.requestSettings.encodeUrlToggle();
    await expect(encodeUrlToggle).toHaveAttribute('aria-checked', 'true');
  });

  test('should reflect encodeUrl false when the key is not present', async ({ launchElectronApp, createTmpDir }) => {
    const context = await launchWithIsolatedCollections({ launchElectronApp, createTmpDir });
    app = context.app;
    const page = context.page;
    const locators = buildCommonLocators(page);

    await expect(locators.sidebar.collection('encode-url-test')).toBeVisible();
    await locators.sidebar.collection('encode-url-test').click();
    await locators.sidebar.request('encode-url-missing').click();
    await selectRequestPaneTab(page, 'Settings');

    // Expected: Encode URL toggle should be unchecked because encodeUrl is missing from the bru file, defaulting to false in UI
    const encodeUrlToggle = locators.requestSettings.encodeUrlToggle();
    await expect(encodeUrlToggle).toHaveAttribute('aria-checked', 'false');
  });

  test('should reflect encodeUrl false when the key is explicitly false', async ({ launchElectronApp, createTmpDir }) => {
    const context = await launchWithIsolatedCollections({ launchElectronApp, createTmpDir });
    app = context.app;
    const page = context.page;
    const locators = buildCommonLocators(page);

    await expect(locators.sidebar.collection('encode-url-test')).toBeVisible();
    await locators.sidebar.collection('encode-url-test').click();
    await locators.sidebar.request('encode-url-false').click();
    await selectRequestPaneTab(page, 'Settings');

    // Expected: Encode URL toggle should be unchecked because encodeUrl is false in the bru file
    const encodeUrlToggle = locators.requestSettings.encodeUrlToggle();
    await expect(encodeUrlToggle).toHaveAttribute('aria-checked', 'false');
  });
});
