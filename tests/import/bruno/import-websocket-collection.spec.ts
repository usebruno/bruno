import path from 'node:path';
import { test, expect } from '../../../playwright';
import { closeAllCollections, importCollection, openRequest } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Import WebSocket collection', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test(
    'TC-1277: Imports a WebSocket collection from Bruno JSON written as .bru',
    { tag: '@sanity' },
    async ({ page, createTmpDir }) => {
      const collectionName = 'ws-import-bru';
      const fixtureFile = path.resolve(__dirname, 'fixtures', 'ws-collection-bru.json');
      const { sidebar, websocket } = buildCommonLocators(page);

      await importCollection(page, fixtureFile, await createTmpDir('ws-import-bru'), {
        expectedCollectionName: collectionName
      });

      await test.step('Verify WebSocket request is visible and opens', async () => {
        await expect(sidebar.collection(collectionName)).toBeVisible();
        await openRequest(page, collectionName, 'echo-ws');
        await websocket.connectionControls.connect().waitFor({ state: 'visible' });
      });
    }
  );

  test(
    'TC-1276: Imports a WebSocket collection from OpenCollection YAML',
    { tag: '@sanity' },
    async ({ page, createTmpDir }) => {
      const collectionName = 'ws-import-yml';
      const fixtureFile = path.resolve(__dirname, 'fixtures', 'ws-collection.yml');
      const { sidebar, websocket } = buildCommonLocators(page);

      await importCollection(page, fixtureFile, await createTmpDir('ws-import-yml'), {
        expectedCollectionName: collectionName
      });

      await test.step('Verify WebSocket request is visible and opens', async () => {
        await expect(sidebar.collection(collectionName)).toBeVisible();
        await openRequest(page, collectionName, 'echo-ws');
        await websocket.connectionControls.connect().waitFor({ state: 'visible' });
      });
    }
  );
});
