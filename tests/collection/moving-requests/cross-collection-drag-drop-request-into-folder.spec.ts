import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createFolder,
  createRequest,
  expandCollection,
  expandFolder,
  selectRequestPaneTab
} from '../../utils/page';

test.describe('Cross-collection drag and drop of a request into a folder', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-766: Verify drag and drop of a request into a specific folder in the destination collection', { tag: '@sanity' }, async ({
    page,
    createTmpDir
  }) => {
    const { sidebar, tabs, request } = buildCommonLocators(page);
    const sourceCollection = 'source-collection';
    const destinationCollection = 'destination-collection';
    const destinationFolder = 'orders';
    const requestName = 'move-me-request';
    const requestMethod = 'POST';
    const requestUrl = 'https://echo.usebruno.com/get?user=bruno';

    await test.step('Create Source Collection, Destination Collection, Source Request, and Destination Folder', async () => {
      await createCollection(page, sourceCollection, await createTmpDir('source-collection'));
      await createRequest(page, requestName, sourceCollection, {
        url: requestUrl,
        method: requestMethod
      });

      await createCollection(page, destinationCollection, await createTmpDir('destination-collection'));
      await createFolder(page, destinationFolder, destinationCollection);
    });

    await test.step('The request is visible in the source collection', async () => {
      await expandCollection(page, sourceCollection);
      await expect(sidebar.itemRowIn(sourceCollection, requestName)).toBeVisible();
    });

    await test.step('The target folder is visible in the destination collection', async () => {
      await expandCollection(page, destinationCollection);
      await expect(sidebar.itemRowIn(destinationCollection, destinationFolder)).toBeVisible();
    });

    await test.step('Drag the request onto the destination folder', async () => {
      // Center of a folder row is an "inside" drop, so the request lands in the folder.
      await sidebar
        .itemRowIn(sourceCollection, requestName)
        .dragTo(sidebar.itemRowIn(destinationCollection, destinationFolder));
    });

    await test.step('The moved request is inside the destination folder', async () => {
      await expandFolder(page, destinationFolder);
      await expect(sidebar.folderRequest(destinationFolder, requestName)).toBeVisible();
    });

    await test.step('The request is no longer in the source collection', async () => {
      await expandCollection(page, sourceCollection);
      await expect(
        sidebar.collectionScope(sourceCollection).getByTitle(requestName, { exact: true })
      ).toHaveCount(0);
    });

    await test.step('Opening the moved request preserves its method, URL, and query param', async () => {
      await sidebar.folderRequest(destinationFolder, requestName).click();
      await expect(tabs.requestTab(requestName)).toBeVisible();
      await expect(request.methodDropdown()).toContainText(requestMethod);
      await expect(request.urlInput()).toContainText('https://echo.usebruno.com/get');

      await selectRequestPaneTab(page, 'Params');
      await expect(request.queryParams.rowByName('user')).toBeVisible();
      await expect(request.queryParams.valueByName('user')).toContainText('bruno');
    });
  });
});
