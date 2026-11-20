import { test, expect } from '../../../playwright';
import { buildCommonLocators, createCollection } from '../../../pages';

type CollectionTab = {
  key: string;
  label: string;
  contentTestId?: string;
  contentText?: string;
};

const collectionTabs: CollectionTab[] = [
  { key: 'overview', label: 'Overview', contentTestId: 'info-version-row' },
  { key: 'headers', label: 'Headers', contentTestId: 'bulk-edit-toggle' },
  { key: 'vars', label: 'Vars', contentTestId: 'collection-vars-panel' },
  { key: 'auth', label: 'Auth', contentTestId: 'auth-mode-selector' },
  {
    key: 'script',
    label: 'Script',
    contentText: 'Write pre and post-request scripts that will run before and after any request in this collection is sent.'
  },
  { key: 'tests', label: 'Tests', contentText: 'These tests will run any time a request in this collection is sent.' },
  { key: 'protobuf', label: 'Protobuf', contentTestId: 'protobuf-proto-files-section' },
  { key: 'settings', label: 'Settings', contentTestId: 'presets-save-btn' },
  { key: 'presets', label: 'Presets', contentTestId: 'presets-save-btn' },
  { key: 'proxy', label: 'Proxy', contentText: 'Configure proxy settings for this collection.' },
  { key: 'clientCert', label: 'Client certificates', contentTestId: 'client-cert-save-btn' }
];

test.describe('TC-2618: Tests for Collection settings tabs', () => {
  test('Verify All Collection Tabs Open Successfully on Clicking on collection', { tag: '@sanity' }, async ({
    page,
    createTmpDir
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const { paneTabs, sidebar } = buildCommonLocators(page);
    const content = paneTabs.collectionSettingsContent();

    await test.step('Open Bruno and create a collection', async () => {
      await createCollection(page, 'Collection Tabs', await createTmpDir('tc-2618'));
      await expect(sidebar.collection('Collection Tabs')).toBeVisible();
      await expect(paneTabs.collectionSettingsTab('overview')).toBeVisible();
    });

    for (const { key, label, contentTestId, contentText } of collectionTabs) {
      await test.step(`Verify every collection settings tab is visible, opened and its content is displayed`, async () => {
        const tab = paneTabs.collectionSettingsTab(key);
        await expect(tab).toBeVisible();
        await tab.click();
        await expect(tab).toContainClass('active');
        await expect(tab).toContainText(label);
        if (contentTestId) {
          await expect(content.getByTestId(contentTestId)).toBeVisible();
        } else {
          await expect(content.getByText(contentText!)).toBeVisible();
        }
      });
    }

    await test.step('Opening the tabs does not throw a page error', async () => {
      expect(pageErrors).toEqual([]);
    });
  });
});