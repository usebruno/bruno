import { test, expect } from '../../../playwright';
import {
  closeAllCollections,
  createCollection,
  createFolder,
  createRequest,
  expandFolder,
  openRequest,
  addCollectionScript,
  addFolderScript,
  addPreRequestScript,
  saveRequest,
  sendRequest,
  selectResponsePaneTab
} from '../../utils/page/actions';

test.describe('Timeline — scoped request attribution', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('request-level sendRequest is attributed to the request, not the collection script', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'timeline-scope-collection';
    const requestName = 'scoped-driver';
    const url = 'http://localhost:8081/ping';

    await test.step('Create collection with a (non-empty) collection-level pre-request script', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName), 'yml');
      // Non-empty collection script => stamps the collection scope before the request runs.
      await addCollectionScript(page, collectionName, 'pre-request', `bru.setVar('collectionRan', true);`);
    });

    await test.step('Create a request whose pre-request script issues a sendRequest', async () => {
      await createRequest(page, requestName, collectionName, { url });
      await openRequest(page, collectionName, requestName);
      await addPreRequestScript(page, `await bru.sendRequest({ url: "${url}", method: "GET" });`);
      await saveRequest(page);
    });

    await test.step('Send the request', async () => {
      await sendRequest(page, 200);
    });

    const scriptedRow = page
      .getByTestId('timeline-entry')
      .filter({ has: page.getByTestId('timeline-badge-pre') });

    await test.step('Open Timeline and expand the scripted (sendRequest) row', async () => {
      await selectResponsePaneTab(page, 'Timeline');
      await expect(scriptedRow).toHaveCount(1);
      await scriptedRow.getByTestId('timeline-item-header').click();
    });

    await test.step('Source file points to the request, not the collection', async () => {
      const sourceFile = scriptedRow.getByTestId('timeline-source-file');
      await expect(sourceFile).toBeVisible();
      await expect(sourceFile).toHaveText('scoped-driver.yml');
      await expect(sourceFile).not.toContainText('opencollection.yml');
    });

    await test.step('Clicking the source link opens the request Script tab', async () => {
      await scriptedRow.getByTestId('timeline-source-link').click();
      await expect(page.locator('.request-tab.active')).toContainText(requestName);
      await expect(page.getByTestId('responsive-tab-script')).toHaveClass(/active/);
    });
  });

  test('request-level sendRequest is attributed to the request, not the parent folder script', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'timeline-scope-folder';
    const folderName = 'auth';
    const requestName = 'folder-driver';
    const url = 'http://localhost:8081/ping';

    await test.step('Create a folder with a (non-empty) folder-level pre-request script', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName), 'yml');
      await createFolder(page, folderName, collectionName);
      await expandFolder(page, folderName);
      // Folder script runs after the collection and overwrites the scope — used to
      // be what a nested request's sendRequest inherited.
      await addFolderScript(page, folderName, 'pre-request', `bru.setVar('folderRan', true);`);
    });

    await test.step('Create a request inside the folder whose pre-request script issues a sendRequest', async () => {
      await createRequest(page, requestName, folderName, { url, inFolder: true });
      await page.locator('.collection-item-name').filter({ hasText: requestName }).first().click();
      await addPreRequestScript(page, `await bru.sendRequest({ url: "${url}", method: "GET" });`);
      await saveRequest(page);
    });

    await test.step('Send the request', async () => {
      await sendRequest(page, 200);
    });

    const scriptedRow = page
      .getByTestId('timeline-entry')
      .filter({ has: page.getByTestId('timeline-badge-pre') });

    await test.step('Open Timeline and expand the scripted (sendRequest) row', async () => {
      await selectResponsePaneTab(page, 'Timeline');
      await expect(scriptedRow).toHaveCount(1);
      await scriptedRow.getByTestId('timeline-item-header').click();
    });

    await test.step('Source file points to the request file, not the folder script', async () => {
      const sourceFile = scriptedRow.getByTestId('timeline-source-file');
      await expect(sourceFile).toBeVisible();
      await expect(sourceFile).toHaveText('auth/folder-driver.yml');
      await expect(sourceFile).not.toContainText('auth/folder.yml');
    });
  });
});
