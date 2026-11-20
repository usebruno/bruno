import { Locator, test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  createCollection,
  selectCollectionPaneTab
} from '../../../pages';

type CollectionTab = {
  key: string;
  label: string;
  content: (locators: ReturnType<typeof buildCommonLocators>) => Locator;
};

const collectionTabs: CollectionTab[] = [
  { key: 'overview', label: 'Overview', content: (l) => l.collectionSettings.versionRow() },
  { key: 'headers', label: 'Headers', content: (l) => l.collectionSettings.headersBulkEditToggle() },
  { key: 'vars', label: 'Vars', content: (l) => l.collectionSettings.varsPanel() },
  { key: 'auth', label: 'Auth', content: (l) => l.collectionSettings.authModeSelector() },
  { key: 'script', label: 'Script', content: (l) => l.collectionSettings.scriptIntro() },
  { key: 'tests', label: 'Tests', content: (l) => l.collectionSettings.testsIntro() },
  {
    key: 'protobuf',
    label: 'Protobuf',
    content: (l) => l.collectionSettings.protobufProtoFilesSection()
  },
  { key: 'presets', label: 'Presets', content: (l) => l.presets.saveBtn() },
  { key: 'proxy', label: 'Proxy', content: (l) => l.collectionSettings.proxyIntro() },
  {
    key: 'clientCert',
    label: 'Client certificates',
    content: (l) => l.collectionSettings.clientCertSaveBtn()
  }
];

test.describe('TC-2618: Tests for Collection settings tabs', () => {
  test('Verify All Collection Tabs Open Successfully on Clicking on collection', { tag: '@sanity' }, async ({
    page,
    createTmpDir
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const locators = buildCommonLocators(page);
    const { paneTabs, sidebar } = locators;

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
        await expect(content(locators)).toBeVisible();
      });
    }

    await test.step('Opening the tabs does not throw a page error', async () => {
      expect(pageErrors).toEqual([]);
    });
  });
});
