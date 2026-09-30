import fs from 'fs';
import path from 'path';
import { closeElectronApp, ElectronApplication, expect, test, waitForReadyPage } from '../../../playwright';
import {
  buildCommonLocators,
  resetRequestTimeoutToInherit,
  saveRequest,
  selectRequestPaneTab,
  setRequestTimeoutPreference
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
    const { app, page, collectionPath } = await launchWithIsolatedCollections({ launchElectronApp, createTmpDir });

    try {
      const { sidebar, requestSettings, request, response, tabs } = buildCommonLocators(page);

      await test.step('Open the timeout-test request from the bru collection', async () => {
        await expect(sidebar.collection('settings-test')).toBeVisible();
        await sidebar.collection('settings-test').click();
        await sidebar.request('timeout-test').click();
        await selectRequestPaneTab(page, 'Settings');
      });

      await test.step('Verify the custom timeout (5ms) from the .bru file is applied', async () => {
        await expect(requestSettings.timeoutInput()).toBeVisible();
        await expect(requestSettings.timeoutInput()).toHaveValue('5');
        await request.sendButton().click();
        await expect(response.pane()).toContainText('timeout of 5ms exceeded');
      });

      // Change the global preference that "inherit" should fall back to
      await setRequestTimeoutPreference(page, '10');

      await test.step('Reset the timeout to inherit and save', async () => {
        await sidebar.request('timeout-test').click();
        await selectRequestPaneTab(page, 'Settings');
        await resetRequestTimeoutToInherit(page);
        await expect(requestSettings.timeoutInheritButton()).toBeVisible();
        await expect(requestSettings.timeoutInput()).not.toBeVisible();
        await saveRequest(page);
      });

      await test.step('Verify the serialized .bru file keeps timeout: inherit', async () => {
        const savedContent = await fs.promises.readFile(
          path.join(collectionPath, 'requests-settings-bru', 'timeout.bru'),
          'utf-8'
        );
        expect(savedContent).toMatch(/timeout:\s*['"]?inherit['"]?/);
      });

      await test.step('Reopen the request and confirm the inherit state persists in the UI', async () => {
        await tabs.requestTab('timeout-test').hover();
        await tabs.closeTab('timeout-test').click({ force: true });
        await sidebar.request('timeout-test').click();
        await selectRequestPaneTab(page, 'Settings');
        await expect(requestSettings.timeoutInheritButton()).toBeVisible();
        await expect(requestSettings.timeoutInput()).not.toBeVisible();
      });

      await test.step('Send and verify the inherited timeout resolves to the preference (10ms), not the file value (5ms)', async () => {
        await request.sendButton().click();
        await expect(response.pane()).toContainText('timeout of 10ms exceeded', { timeout: 15000 });
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('should persist inherit timeout for a yaml request', async ({ launchElectronApp, createTmpDir }) => {
    const { app, page, collectionPath } = await launchWithIsolatedCollections({ launchElectronApp, createTmpDir });

    try {
      const { sidebar, requestSettings, request, response, tabs } = buildCommonLocators(page);

      await test.step('Open the timeout-test-yaml request from the yaml collection', async () => {
        await expect(sidebar.collection('settings-yaml')).toBeVisible();
        await sidebar.collection('settings-yaml').click();
        await sidebar.request('timeout-test-yaml').click();
        await selectRequestPaneTab(page, 'Settings');
      });

      await test.step('Verify the custom timeout (5ms) from the .yml file is applied', async () => {
        await expect(requestSettings.timeoutInput()).toBeVisible();
        await expect(requestSettings.timeoutInput()).toHaveValue('5');
        await request.sendButton().click();
        await expect(response.pane()).toContainText('timeout of 5ms exceeded');
      });

      // Change the global preference that "inherit" should fall back to
      await setRequestTimeoutPreference(page, '10');

      await test.step('Reset the timeout to inherit and save', async () => {
        await sidebar.request('timeout-test-yaml').click();
        await selectRequestPaneTab(page, 'Settings');
        await resetRequestTimeoutToInherit(page);
        await expect(requestSettings.timeoutInheritButton()).toBeVisible();
        await expect(requestSettings.timeoutInput()).not.toBeVisible();
        await saveRequest(page);
      });

      await test.step('Verify the serialized .yml file keeps timeout: inherit (not reset to 0)', async () => {
        const savedContent = await fs.promises.readFile(
          path.join(collectionPath, 'requests-settings-yml', 'timeout.yml'),
          'utf-8'
        );
        expect(savedContent).toMatch(/timeout:\s*['"]?inherit['"]?/);
      });

      await test.step('Reopen the request and confirm the inherit state persists in the UI', async () => {
        await tabs.requestTab('timeout-test-yaml').hover();
        await tabs.closeTab('timeout-test-yaml').click({ force: true });
        await sidebar.request('timeout-test-yaml').click();
        await selectRequestPaneTab(page, 'Settings');
        await expect(requestSettings.timeoutInheritButton()).toBeVisible();
        await expect(requestSettings.timeoutInput()).not.toBeVisible();
      });

      await test.step('Send and verify the inherited timeout resolves to the preference (10ms), not the file value (5ms)', async () => {
        await request.sendButton().click();
        await expect(response.pane()).toContainText('timeout of 10ms exceeded', { timeout: 15000 });
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
