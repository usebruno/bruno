import { test, expect } from '../../../playwright';
import { buildCommonLocators,
  expandFolder,
  createCollection,
  createFolder,
  createRequest,
  expandCollection,
  selectRequestPaneTab,
  closeAllCollections
} from '../../utils/page';

test.describe('Cross-Collection Drag and Drop', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Verify request drag and drop', async ({ page, createTmpDir }) => {
    const requestName = 'drag-drop-request';

    // Create first collection - open with sandbox mode
    await createCollection(page, 'source-collection', await createTmpDir('source-collection'));

    // Create a request in the first collection using the dialog/modal flow
    await createRequest(page, requestName, 'source-collection', { url: 'https://echo.usebruno.com' });

    // Create second collection - open with sandbox mode
    await createCollection(page, 'target-collection', await createTmpDir('target-collection'));

    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'source-collection' })).toBeVisible();
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'target-collection' })).toBeVisible();

    // Locate the request in source collection
    const sourceCollectionContainer = page.locator('[data-collection-id="source-collection"]');
    const sourceRequest = sourceCollectionContainer.locator('.collection-item-name').filter({ hasText: requestName }).first();
    await expect(sourceRequest).toBeVisible();

    // Locate the target collection area (the collection name element)
    const targetCollection = page.locator('.collection-name').filter({ hasText: 'target-collection' });
    await expect(targetCollection).toBeVisible();

    // Perform drag and drop operation
    await sourceRequest.dragTo(targetCollection);

    // Verify the request has been moved to the target collection
    // Check that the request now appears under target collection
    const targetCollectionContainer = page.locator('[data-collection-id="target-collection"]');
    await expect(targetCollectionContainer.locator('.collection-item-name').filter({ hasText: requestName })).toBeVisible();

    // Verify the request is no longer in the source collection
    await page.locator('#sidebar-collection-name').filter({ hasText: 'source-collection' }).click();
    await expect(sourceCollectionContainer.locator('.collection-item-name').filter({ hasText: requestName })).toHaveCount(0);
  });

  test('Silently suffixes the filename when a duplicate request name exists in the drop location', async ({
    page,
    createTmpDir
  }) => {
    const requestName = 'duplicate-request';

    // Create first collection (source-collection)
    await createCollection(page, 'source-collection', await createTmpDir('source-collection'));

    // Create a request in the first collection using the dialog/modal flow
    await createRequest(page, requestName, 'source-collection', { url: 'https://echo.usebruno.com' });

    // Create second collection (target-collection)
    await createCollection(page, 'target-collection', await createTmpDir('target-collection'));

    // Create a request with the same name in the target collection using the dialog/modal flow
    await createRequest(page, requestName, 'target-collection', { url: 'https://echo.usebruno.com' });

    // Go back to source collection to drag the request
    await page.locator('#sidebar-collection-name').filter({ hasText: 'source-collection' }).click();

    const sourceCollectionContainer = page.locator('[data-collection-id="source-collection"]');
    const targetCollectionContainer = page.locator('[data-collection-id="target-collection"]');

    const sourceRequest = sourceCollectionContainer.locator('.collection-item-name').filter({ hasText: requestName }).first();
    await expect(sourceRequest).toBeVisible();

    // Locate the target collection area
    const targetCollection = page.locator('.collection-name').filter({ hasText: 'target-collection' });
    await expect(targetCollection).toBeVisible();

    // Perform drag and drop operation to target-collection
    await sourceRequest.dragTo(targetCollection);

    await expect(sourceCollectionContainer.locator('.collection-item-name').filter({ hasText: requestName })).toHaveCount(0);

    // The target collection now shows two entries with the same display name
    // (the original and the moved one; the filesystem name was silently suffixed).
    await page.locator('#sidebar-collection-name').filter({ hasText: 'target-collection' }).click();
    await expect(targetCollectionContainer.locator('.collection-item-name').filter({ hasText: requestName })).toHaveCount(2);

    await expect(page.getByText(/already exists/i)).toHaveCount(0);
  });

  test('Tab should be closed after cross-collection drag and drop', async ({ page, createTmpDir }) => {
    const requestName = 'tab-close-request';

    // Create source and target collections
    await createCollection(page, 'source-collection', await createTmpDir('source-collection'));
    await createRequest(page, requestName, 'source-collection', { url: 'https://echo.usebruno.com' });

    await createCollection(page, 'target-collection', await createTmpDir('target-collection'));

    // Open the request to create a tab
    const sourceCollectionContainer = page.locator('[data-collection-id="source-collection"]');
    const sourceRequest = sourceCollectionContainer.locator('.collection-item-name').filter({ hasText: requestName }).first();
    await sourceRequest.click();

    // Verify the tab is open
    const requestTab = page.locator('.request-tab .tab-label').filter({ hasText: requestName });
    await expect(requestTab).toBeVisible();

    // Drag the request to target collection
    const targetCollection = page.locator('.collection-name').filter({ hasText: 'target-collection' });
    await sourceRequest.dragTo(targetCollection);

    // Verify the tab is closed after cross-collection move
    await expect(requestTab).not.toBeVisible();

    // Verify the request appears in the target collection
    const targetCollectionContainer = page.locator('[data-collection-id="target-collection"]');
    await expect(targetCollectionContainer.locator('.collection-item-name').filter({ hasText: requestName })).toBeVisible();
  });

  test('TC-766: Verify cross-collection drag and drop of a request into a specific folder in the destination collection', { tag: '@sanity' }, async ({
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
