import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  selectCollectionPaneTab
} from '../../../pages';
import {
  buildCollectionPresetsLocators,
  buildCollectionSettingsPanelLocators
} from '../../../pages/collection/settings';

test.describe('TC-2618: Tests for Collection settings tabs', () => {
  test('Verify All Collection Tabs Open Successfully on Clicking on collection', { tag: '@sanity' }, async ({
    page,
    createTmpDir
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const { paneTabs, sidebar } = buildCommonLocators(page);
    const settings = buildCollectionSettingsPanelLocators(page);
    const presets = buildCollectionPresetsLocators(page);

    const collectionTabs = [
      { key: 'overview', label: 'Overview', content: () => settings.versionRow() },
      { key: 'headers', label: 'Headers', content: () => settings.headersBulkEditToggle() },
      { key: 'vars', label: 'Vars', content: () => settings.varsPanel() },
      { key: 'auth', label: 'Auth', content: () => settings.authModeSelector() },
      { key: 'script', label: 'Script', content: () => settings.scriptIntro() },
      { key: 'tests', label: 'Tests', content: () => settings.testsIntro() },
      { key: 'protobuf', label: 'Protobuf', content: () => settings.protobufProtoFilesSection() },
      { key: 'presets', label: 'Presets', content: () => presets.saveBtn() },
      { key: 'proxy', label: 'Proxy', content: () => settings.proxyIntro() },
      { key: 'clientCert', label: 'Client certificates', content: () => settings.clientCertSaveBtn() }
    ];

    await test.step('Open Bruno and create a collection', async () => {
      await createCollection(page, 'Collection Tabs', await createTmpDir('tc-2618'));
      await expect(sidebar.collection('Collection Tabs')).toBeVisible();
      await expect(paneTabs.collectionSettingsTab('overview')).toBeVisible();
    });

    for (const { key, label, content } of collectionTabs) {
      await test.step(`Verify the ${label} collection settings tab opens and shows its content`, async () => {
        await selectCollectionPaneTab(page, key);

        const tab = paneTabs.collectionSettingsTab(key);
        await expect(tab).toBeVisible();
        await expect(tab).toContainClass('active');
        await expect(tab).toContainText(label);
        await expect(content()).toBeVisible();
      });
    }

    await test.step('Opening the tabs does not throw a page error', async () => {
      expect(pageErrors).toEqual([]);
    });

    await closeAllCollections(page);
  });
});
