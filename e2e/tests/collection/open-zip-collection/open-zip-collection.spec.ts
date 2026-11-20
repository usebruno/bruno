import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  exportCollectionAsZip,
  importCollection,
  openRequest,
  removeCollection,
  sendRequest
} from '../../../pages';

const COLLECTION_NAME = 'Open Zip Collection';
const REQUEST_NAME = 'Ping';

test.describe('Export a bru collection as ZIP and import it back', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('TC-3155: user is able to import an exported ZIP collection and execute a request', { tag: '@sanity' }, async ({
    pageWithUserData: page,
    reuseOrLaunchElectronApp,
    createTmpDir
  }, testInfo) => {
    const { sidebar, response } = buildCommonLocators(page);
    const electronApp = await reuseOrLaunchElectronApp({ testFile: testInfo.file });
    const exportDir = await createTmpDir('open-zip-export');
    const importLocation = await createTmpDir('open-zip-import');
    const zipFilePath = path.join(exportDir, `${COLLECTION_NAME}.zip`);

    await test.step('Export the collection as ZIP from the sidebar Share menu', async () => {
      await exportCollectionAsZip(page, electronApp, COLLECTION_NAME, exportDir);
    });

    await test.step('Verify that the ZIP file is written', async () => {
      expect(fs.existsSync(zipFilePath)).toBe(true);
    });

    await test.step('Remove the collection and import the exported ZIP', async () => {
      await removeCollection(page, COLLECTION_NAME);
      await importCollection(page, zipFilePath, importLocation);
    });

    await test.step('Verify that the imported collection opens in the sidebar', async () => {
      await expect(sidebar.collection(COLLECTION_NAME)).toBeVisible();
    });

    await test.step('Execute a request from the imported collection', async () => {
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await sendRequest(page);
    });

    await test.step('Verify that the request executes successfully', async () => {
      await expect(response.statusCode()).toContainText('200');
    });
  });
});
