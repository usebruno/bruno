import fs from 'fs';
import path from 'path';
import { expect, test, closeElectronApp, waitForReadyPage, ElectronApplication } from '../../../playwright';
import {
  buildCommonLocators,
  selectRequestPaneTab,
  saveRequest,
  setRequestTimeoutPreference,
  resetRequestTimeoutToInherit
} from '../../utils/page';

const initUserDataPath = path.join(__dirname, 'init-user-data');
const fixtureCollectionsPath = path.join(__dirname, 'fixtures', 'collections');

type LaunchFixtures = {
  launchElectronApp: (options?: { initUserDataPath?: string; templateVars?: Record<string, string> }) => Promise<ElectronApplication>;
  createTmpDir: (tag?: string) => Promise<string>;
};

// Copy the committed fixture collections into a per-test tmp dir and launch an app that opens them.
// Each test mutates only its own copy, so the tests are parallel- and retry-safe and need no restore.
const launchWithIsolatedCollections = async ({ launchElectronApp, createTmpDir }: LaunchFixtures) => {
  const collectionPath = await createTmpDir('settings-collections');
  await fs.promises.cp(fixtureCollectionsPath, collectionPath, { recursive: true });
  const app = await launchElectronApp({ initUserDataPath, templateVars: { collectionPath } });
  const page = await waitForReadyPage(app);
  return { app, page, collectionPath };
};

test.describe('Timeout Settings Tests', () => {
  test('should persist inherit timeout for a bru request', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(60000);
    const { app, page, collectionPath } = await launchWithIsolatedCollections({ launchElectronApp, createTmpDir });

    try {
      const { sidebar, requestSettings, request, response, tabs } = buildCommonLocators(page);

      // Open the request from the bru collection
      await expect(sidebar.collection('settings-test')).toBeVisible();
      await sidebar.collection('settings-test').click();
      await sidebar.request('timeout-test').click();
      await selectRequestPaneTab(page, 'Settings');

      // Verify the custom timeout value from the .bru file (5)
      await expect(requestSettings.timeoutInput()).toBeVisible();
      await expect(requestSettings.timeoutInput()).toHaveValue('5');

      // Send and verify the custom timeout (5ms) is applied
      await request.sendButton().click();
      await expect(response.pane()).toContainText('timeout of 5ms exceeded');

      // Change the global preference that "inherit" should fall back to
      await setRequestTimeoutPreference(page, '10');

      // Return to the request and Settings tab
      await sidebar.request('timeout-test').click();
      await selectRequestPaneTab(page, 'Settings');

      // Reset the timeout to inherit
      await resetRequestTimeoutToInherit(page);
      await expect(requestSettings.timeoutInheritButton()).toBeVisible();
      await expect(requestSettings.timeoutInput()).not.toBeVisible();

      // Save so the inherit setting is serialized to disk
      await saveRequest(page);

      // Verify persistence: the serialized file keeps timeout: inherit (not reset to a custom value)
      const savedContent = await fs.promises.readFile(
        path.join(collectionPath, 'requests-settings-bru', 'timeout.bru'),
        'utf-8'
      );
      expect(savedContent).toMatch(/timeout:\s*['"]?inherit['"]?/);

      // Reopen the request to confirm the inherit state persists in the Settings UI after reload
      await tabs.requestTab('timeout-test').hover();
      await tabs.closeTab('timeout-test').click({ force: true });
      await sidebar.request('timeout-test').click();
      await selectRequestPaneTab(page, 'Settings');
      await expect(requestSettings.timeoutInheritButton()).toBeVisible();
      await expect(requestSettings.timeoutInput()).not.toBeVisible();

      // Send and verify the inherited timeout resolves to the preference (10ms), not the file value (5ms)
      await request.sendButton().click();
      await expect(response.pane()).toContainText('timeout of 10ms exceeded', { timeout: 15000 });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('should persist inherit timeout for a yaml request', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(60000);
    const { app, page, collectionPath } = await launchWithIsolatedCollections({ launchElectronApp, createTmpDir });

    try {
      const { sidebar, requestSettings, request, response, tabs } = buildCommonLocators(page);

      // Open the request from the yaml collection
      await expect(sidebar.collection('settings-yaml')).toBeVisible();
      await sidebar.collection('settings-yaml').click();
      await sidebar.request('timeout-test-yaml').click();
      await selectRequestPaneTab(page, 'Settings');

      // Verify the custom timeout value from the .yml file (5)
      await expect(requestSettings.timeoutInput()).toBeVisible();
      await expect(requestSettings.timeoutInput()).toHaveValue('5');

      // Send and verify the custom timeout (5ms) is applied
      await request.sendButton().click();
      await expect(response.pane()).toContainText('timeout of 5ms exceeded');

      // Change the global preference that "inherit" should fall back to
      await setRequestTimeoutPreference(page, '10');

      // Return to the request and Settings tab
      await sidebar.request('timeout-test-yaml').click();
      await selectRequestPaneTab(page, 'Settings');

      // Reset the timeout to inherit
      await resetRequestTimeoutToInherit(page);
      await expect(requestSettings.timeoutInheritButton()).toBeVisible();
      await expect(requestSettings.timeoutInput()).not.toBeVisible();

      // Save so the inherit setting is serialized to disk
      await saveRequest(page);

      // Verify YAML persistence: the serialized file keeps timeout: inherit (not reset to 0)
      const savedContent = await fs.promises.readFile(
        path.join(collectionPath, 'requests-settings-yml', 'timeout.yml'),
        'utf-8'
      );
      expect(savedContent).toMatch(/timeout:\s*['"]?inherit['"]?/);

      // Reopen the request to confirm the inherit state persists in the Settings UI after reload
      await tabs.requestTab('timeout-test-yaml').hover();
      await tabs.closeTab('timeout-test-yaml').click({ force: true });
      await sidebar.request('timeout-test-yaml').click();
      await selectRequestPaneTab(page, 'Settings');
      await expect(requestSettings.timeoutInheritButton()).toBeVisible();
      await expect(requestSettings.timeoutInput()).not.toBeVisible();

      // Send and verify the inherited timeout resolves to the preference (10ms), not the file value (5ms)
      await request.sendButton().click();
      await expect(response.pane()).toContainText('timeout of 10ms exceeded', { timeout: 15000 });
    } finally {
      await closeElectronApp(app);
    }
  });
});
