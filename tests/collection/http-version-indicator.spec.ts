import { test, expect } from '../../playwright';
import { buildCommonLocators, closeAllCollections, createCollection, selectCollectionPaneTab } from '../utils/page';

test.describe('HTTP version status dot in collection settings', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Protocols > HTTP row and the Settings tab show the status dot once a collection HTTP version is set', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'test-http-version-indicator';
    const locators = buildCommonLocators(page);
    const httpRow = locators.paneTabs.collectionSettingsTab('http');
    const settingsTab = locators.paneTabs.collectionSettingsTab('settings');

    await test.step('Create a fresh collection (opens collection settings tab)', async () => {
      await createCollection(page, collectionName, await createTmpDir());
    });

    await test.step('Open Settings > Protocols > HTTP', async () => {
      await selectCollectionPaneTab(page, 'http');
    });

    await test.step('Verify no dot while the HTTP version is Inherit', async () => {
      await expect(locators.collectionHttp.versionTrigger()).toContainText('Inherit');
      await expect(httpRow.getByTestId('status-dot')).toBeHidden();
      await expect(settingsTab.getByTestId('status-dot')).toBeHidden();
    });

    await test.step('Set the collection HTTP version to HTTP/2 and save', async () => {
      await locators.collectionHttp.versionTrigger().click();
      await locators.collectionHttp.versionOption('HTTP/2').click();
      await expect(locators.collectionHttp.versionTrigger()).toContainText('HTTP/2');
      await locators.collectionHttp.saveBtn().click();
      await expect(locators.tabs.tabDraftIndicator(locators.tabs.collectionSettingsTab())).toBeHidden();
    });

    await test.step('Leave the Settings tab, then come back to the sidebar', async () => {
      await selectCollectionPaneTab(page, 'overview');
      await expect(httpRow).toBeHidden();
      await selectCollectionPaneTab(page, 'http');
    });

    await test.step('Verify the HTTP row and the Settings tab show the same status dot as Proxy / Client certificates', async () => {
      await expect(locators.collectionHttp.versionTrigger()).toContainText('HTTP/2');
      await expect(httpRow.getByTestId('status-dot')).toBeVisible();
      await expect(settingsTab.getByTestId('status-dot')).toBeVisible();
    });
  });
});
