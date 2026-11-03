import { test, expect } from '../../../playwright';
import * as path from 'path';
import {
  buildCommonLocators,
  closeAllCollections,
  exportCollectionAsZip,
  importCollection,
  openCollectionFromDialog,
  openRequest,
  removeCollection,
  sendRequest,
  switchToEditorTab
} from '../../utils/page';

const COLLECTION_NAME = 'Open Zip Collection';

test.describe('Export a bru collection as ZIP and import it back', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-3155: user is able to import an exported ZIP collection and execute a request', { tag: '@sanity' }, async ({
    page,
    electronApp,
    collectionFixturePath,
    createTmpDir
  }) => {
    const { sidebar, response } = buildCommonLocators(page);
    const exportDir = await createTmpDir('open-zip-export');
    const importLocation = await createTmpDir('open-zip-import');
    const zipFilePath = path.join(exportDir, `${COLLECTION_NAME}.zip`);

    await test.step('Open the bru collection', async () => {
      await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
      await expect(sidebar.collection(COLLECTION_NAME)).toBeVisible();
    });

    await test.step('Export the collection as a Bruno Collection (ZIP)', async () => {
      const zippedFiles = await exportCollectionAsZip(page, electronApp, COLLECTION_NAME, exportDir);
      expect(zippedFiles.length).toBeGreaterThan(0);
    });

    // The imported collection keeps the same name, so close the original to keep sidebar lookups unambiguous.
    await removeCollection(page, COLLECTION_NAME);

    await test.step('Import the exported ZIP collection', async () => {
      await importCollection(page, zipFilePath, importLocation, { expectedCollectionName: COLLECTION_NAME });
      await expect(sidebar.collection(COLLECTION_NAME)).toBeVisible();
    });

    await test.step('Execute a request from the imported collection', async () => {
      await openRequest(page, COLLECTION_NAME, 'Ping');
      await sendRequest(page, 200);
      await switchToEditorTab(page);
      await expect(response.previewContainerCodeMirror()).toContainText('pong');
    });
  });
});
