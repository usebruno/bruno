import path from 'path';
import { test, expect } from '../../../playwright';
import { importCollection, closeAllCollections } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Import Bruno v2 JSON collection', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('proxy settings are preserved after importing a v2 JSON collection', async ({ page, createTmpDir }) => {
    const collectionName = 'proxy-collection-v2';
    const collectionFile = path.join(__dirname, 'fixtures', 'bruno-v2-json-collection-with-proxy.json');
    const locators = buildCommonLocators(page);

    await test.step('Import v2 JSON collection', async () => {
      await importCollection(page, collectionFile, await createTmpDir('v2-json-proxy-import'), {
        expectedCollectionName: collectionName
      });
    });

    await test.step('Open collection settings → Proxy tab', async () => {
      await locators.sidebar.collection(collectionName).hover();
      await locators.actions.collectionActions(collectionName).click();
      await locators.dropdown.item('Settings').click();
      await locators.paneTabs.collectionSettingsTab('proxy').click();
    });

    await test.step('Verify proxy settings match the imported file', async () => {
      await expect(page.locator('input[name="enabled"][value="true"]')).toBeChecked();
      await expect(page.locator('input[name="protocol"][value="http"]')).toBeChecked();
      await expect(page.locator('#hostname')).toHaveValue('127.0.0.1');
      await expect(page.locator('#port')).toHaveValue('8080');
      await expect(page.locator('input[name="auth.disabled"]')).not.toBeChecked();
    });
  });
});
