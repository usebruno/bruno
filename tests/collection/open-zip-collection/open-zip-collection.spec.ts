import { test, expect } from '../../../playwright';
import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';
import { buildCommonLocators, closeAllCollections, openCollectionFromDialog, openRequest, sendRequest, switchToEditorTab } from '../../utils/page';

const COLLECTION_NAME = 'Open Zip Collection';
const COLLECTION_DIR_NAME = 'open-zip-collection';

test.describe('Open an unzipped bru collection', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-3155: user is able to open an unzipped bru collection and execute a request', { tag: '@sanity' }, async ({
    page,
    electronApp,
    collectionFixturePath,
    createTmpDir
  }) => {
    const { sidebar, response } = buildCommonLocators(page);
    const zipFilePath = path.join(await createTmpDir('open-zip-source'), `${COLLECTION_DIR_NAME}.zip`);
    const unzipLocation = await createTmpDir('open-zip-extracted');
    const unzippedCollectionPath = path.join(unzipLocation, COLLECTION_DIR_NAME);

    await test.step('Zip the bru collection', async () => {
      const zip = new AdmZip();
      zip.addLocalFolder(collectionFixturePath!, COLLECTION_DIR_NAME);
      zip.writeZip(zipFilePath);
    });

    await test.step('Unzip the collection', async () => {
      new AdmZip(zipFilePath).extractAllTo(unzipLocation);
      expect(fs.existsSync(path.join(unzippedCollectionPath, 'bruno.json'))).toBe(true);
      expect(fs.existsSync(path.join(unzippedCollectionPath, 'ping.bru'))).toBe(true);
    });

    await test.step('Open the unzipped collection', async () => {
      await openCollectionFromDialog(page, electronApp, unzippedCollectionPath);
      await expect(sidebar.collection(COLLECTION_NAME)).toBeVisible();
    });

    await test.step('Execute a request from the opened collection', async () => {
      await openRequest(page, COLLECTION_NAME, 'Ping');
      await sendRequest(page, 200);
      await switchToEditorTab(page);
      await expect(response.previewContainerCodeMirror()).toContainText('pong');
    });
  });
});
