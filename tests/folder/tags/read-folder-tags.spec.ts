import { test, expect } from '../../../playwright';
import { openFolderSettingsByPath, selectFolderSettingsTab, selectRequestPaneTab } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const COLLECTION_NAME = 'folder-tags';

/**
 * The fixture stages one tree whose effective tags are the product of the cascade:
 *
 *   untagged                  -> []
 *   own-tagged      [smoke]   -> [smoke]
 *   api/            [api]
 *     inherits-only           -> [api]
 *     own-and-inherited [smoke] -> [smoke, api]
 *     v2/           [v2]
 *       nested                -> [api, v2]
 *       reports-tags [smoke]  -> [smoke, api, v2]
 *   legacy/         [wip]
 *     inherits-wip  [smoke]   -> [smoke, wip]
 *   misc/                     (no tags — the control)
 *     plain                   -> []
 *
 * These tests only read, so they share one app instance across the file.
 */
test.describe('Folder Tags — inheritance display', () => {
  test('reads a folder\'s own tags from folder.bru into the Settings tab', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await openFolderSettingsByPath(page, COLLECTION_NAME, ['api']);

    await test.step('Settings tab is flagged as carrying tags', async () => {
      await expect(locators.paneTabs.folderSettingsTab('settings').getByTestId('status-dot')).toBeVisible();
    });

    await selectFolderSettingsTab(page, 'settings');

    await test.step('The folder owns "api" and inherits nothing', async () => {
      await expect(locators.tags.ownItem('api')).toBeVisible();
      await expect(locators.tags.ownItems()).toHaveCount(1);
      await expect(locators.tags.inheritedToggle()).toBeHidden();
    });
  });

  test('shows neither chips nor a status dot for a folder with no tags', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await openFolderSettingsByPath(page, COLLECTION_NAME, ['misc']);

    await expect(locators.paneTabs.folderSettingsTab('settings')).toBeVisible();
    await expect(locators.paneTabs.folderSettingsTab('settings').getByTestId('status-dot')).toBeHidden();

    await selectFolderSettingsTab(page, 'settings');

    await expect(locators.tags.input()).toBeVisible();
    await expect(locators.tags.ownItems()).toHaveCount(0);
    await expect(locators.tags.inheritedToggle()).toBeHidden();
  });

  test('shows a nested folder\'s inherited tags, collapsed, attributed to their source folder', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);

    await openFolderSettingsByPath(page, COLLECTION_NAME, ['api', 'v2']);
    await selectFolderSettingsTab(page, 'settings');

    await test.step('Own tags stay separate from inherited ones', async () => {
      await expect(locators.tags.ownItem('v2')).toBeVisible();
      await expect(locators.tags.ownItems()).toHaveCount(1);
    });

    await test.step('Inherited tags are summarised and hidden until expanded', async () => {
      await expect(locators.tags.inheritedToggle()).toContainText('1 Inherited from parent');
      await expect(locators.tags.inheritedToggle()).toHaveAttribute('aria-expanded', 'false');
      await expect(locators.tags.inheritedList()).toBeHidden();
    });

    await test.step('Expanding reveals "api", attributed to the folder it came from', async () => {
      await locators.tags.inheritedToggle().click();
      await expect(locators.tags.inheritedToggle()).toHaveAttribute('aria-expanded', 'true');
      await expect(locators.tags.inheritedList()).toBeVisible();
      await expect(locators.tags.inheritedItems()).toHaveCount(1);
      await expect(locators.tags.inheritedItem('api')).toBeVisible();

      // react-tooltip renders into a portal after a show delay, so re-hover on each poll
      // rather than asserting once against a tooltip that may not have appeared yet.
      await expect(async () => {
        await locators.tags.inheritedItem('api').hover();
        await expect(page.locator('.toolhint')).toContainText('Inherited from folder "api"', { timeout: 2000 });
      }).toPass({ timeout: 15000 });
    });
  });

  test('cascades both ancestor folders onto a request two levels down', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await openFolderSettingsByPath(page, COLLECTION_NAME, ['api', 'v2']);
    await locators.sidebar.itemsIn(COLLECTION_NAME, 'reports-tags').click();
    await expect(locators.tabs.activeRequestTab()).toContainText('reports-tags');

    await selectRequestPaneTab(page, 'Settings');

    await test.step('The request owns only "smoke"', async () => {
      await expect(locators.tags.ownItem('smoke')).toBeVisible();
      await expect(locators.tags.ownItems()).toHaveCount(1);
    });

    await test.step('Both "api" and "v2" arrive by inheritance', async () => {
      await expect(locators.tags.inheritedToggle()).toContainText('2 Inherited from parent');
      await locators.tags.inheritedToggle().click();
      await expect(locators.tags.inheritedItems()).toHaveCount(2);
      await expect(locators.tags.inheritedItem('api')).toBeVisible();
      await expect(locators.tags.inheritedItem('v2')).toBeVisible();
    });
  });

  test('does not cascade tags upward or between sibling folders', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await test.step('A child folder\'s tag never reaches its parent', async () => {
      await openFolderSettingsByPath(page, COLLECTION_NAME, ['api']);
      await selectFolderSettingsTab(page, 'settings');
      await expect(locators.tags.ownItem('api')).toBeVisible();
      await expect(locators.tags.inheritedToggle()).toBeHidden();
    });

    await test.step('A sibling subtree\'s tag never reaches a collection-root request', async () => {
      await locators.sidebar.itemsIn(COLLECTION_NAME, 'untagged').click();
      await expect(locators.tabs.activeRequestTab()).toContainText('untagged');
      await selectRequestPaneTab(page, 'Settings');
      await expect(locators.tags.input()).toBeVisible();
      await expect(locators.tags.ownItems()).toHaveCount(0);
      await expect(locators.tags.inheritedToggle()).toBeHidden();
    });
  });
});
