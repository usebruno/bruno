import { test, expect } from '../../../playwright';
import { buildCommonLocators, createCollection } from '../../utils/page';

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
  { key: 'script', label: 'Script', contentTestId: 'collection-pre-request-script-editor' },
  { key: 'tests', label: 'Tests', contentText: 'These tests will run any time a request in this collection is sent.' },
  { key: 'presets', label: 'Presets', contentTestId: 'presets-save-btn' },
  { key: 'proxy', label: 'Proxy', contentTestId: 'collection-proxy-hostname' },
  { key: 'clientCert', label: 'Client Certificates', contentTestId: 'client-cert-save-btn' },
  { key: 'secrets', label: 'Secrets', contentText: 'Secret manager configuration has been migrated to Environments' },
  { key: 'protobuf', label: 'Protobuf', contentTestId: 'protobuf-proto-files-section' }
];

test.describe('Collection settings tabs', () => {
  test('TC-2618: Verify All Collection Tabs Open Successfully on Clicking on collection', { tag: '@sanity' }, async ({
    page,
    createTmpDir
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const { paneTabs, sidebar } = buildCommonLocators(page);
    const content = page.getByTestId('collection-settings-content');

    await test.step('Open Bruno and create a collection', async () => {
      await page.locator('[data-app-state="loaded"]').waitFor();
      await createCollection(page, 'Collection Tabs', await createTmpDir('tc-2618'));
      await expect(sidebar.collection('Collection Tabs')).toBeVisible();
      await expect(paneTabs.collectionSettingsTab('overview')).toBeVisible();
    });

    await test.step('Every collection settings tab is visible', async () => {
      for (const { key, label } of collectionTabs) {
        const tab = paneTabs.collectionSettingsTab(key);
        await expect(tab).toBeVisible();
        await expect(tab).toContainText(label);
      }
    });

    for (const { key, label, contentTestId, contentText } of collectionTabs) {
      await test.step(`Open the ${label} tab and check its content`, async () => {
        const tab = paneTabs.collectionSettingsTab(key);
        await tab.click();
        await expect(tab).toContainClass('active');
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
