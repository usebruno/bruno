import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection, createRequest, deleteRequest } from '../../utils/page';

test.describe('Delete Request Sequence Updation', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Maintain correct sequence after deleting requests', async ({ page, createTmpDir }) => {
    const collectionName = 'test-collection';

    // Create a collection
    await createCollection(page, collectionName, await createTmpDir(collectionName), { openWithSandboxMode: 'safe' });

    // Create request-a
    await createRequest(page, 'request-a', collectionName);

    // Create request-b
    await createRequest(page, 'request-b', collectionName);

    // Create request-c
    await createRequest(page, 'request-c', collectionName);

    // Create request-d
    await createRequest(page, 'request-d', collectionName);

    // Verify all requests are created in order
    const allRequests = page.locator('.collection-item-name');
    await expect(allRequests.nth(0)).toContainText('request-a');
    await expect(allRequests.nth(1)).toContainText('request-b');
    await expect(allRequests.nth(2)).toContainText('request-c');
    await expect(allRequests.nth(3)).toContainText('request-d');

    // Delete request-b
    await deleteRequest(page, 'request-b', collectionName);

    // Delete request-c
    await deleteRequest(page, 'request-c', collectionName);

    // Verify remaining requests are in correct order (a and d)
    const remainingRequests = page.locator('.collection-item-name');
    await expect(remainingRequests.nth(0)).toContainText('request-a');
    await expect(remainingRequests.nth(1)).toContainText('request-d');

    // Create request-e
    await createRequest(page, 'request-e', collectionName);

    // Verify request-e is created at the last position (3rd position: a, d, e)
    const finalRequests = page.locator('.collection-item-name');
    await expect(finalRequests.nth(0)).toContainText('request-a');
    await expect(finalRequests.nth(1)).toContainText('request-d');
    await expect(finalRequests.nth(2)).toContainText('request-e');
    await expect(finalRequests).toHaveCount(3);
  });
});
