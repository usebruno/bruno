import path from 'path';
import { test, expect } from '../../../playwright';
import {
  importCollection,
  closeAllCollections,
  openCollectionSettings,
  selectCollectionPaneTab,
  readCollectionProxyField,
  readCollectionProxyProtocol
} from '../../utils/page';
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
      await openCollectionSettings(page, collectionName);
      await selectCollectionPaneTab(page, 'proxy');
    });

    await test.step('Verify proxy settings match the imported file', async () => {
      await expect(locators.collectionProxy.mode('Custom')).toBeChecked();
      await expect.poll(() => readCollectionProxyProtocol(page)).toBe('SOCKS5');
      await expect.poll(() => readCollectionProxyField(page, 'hostname')).toBe('127.0.0.1');
      await expect.poll(() => readCollectionProxyField(page, 'port')).toBe('8080');
      await expect(locators.collectionProxy.authCheckbox()).not.toBeChecked();
    });
  });
});
