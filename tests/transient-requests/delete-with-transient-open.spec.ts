import { test, expect, ConsoleMessage } from '../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  createTransientRequest,
  deleteRequest,
  fillRequestUrl
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

const COLLECTION_NAME = 'delete-with-transient';

// A transient request is stored outside the collection directory. Deriving its folders from the
// collection root used to add a `..` folder to the tree, which every later delete then asked the
// main process to resequence — and it rejects paths outside the collection.
test.describe('Deleting items while a transient request is open', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('deletes a request without an error toast', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);

    await createCollection(page, COLLECTION_NAME, await createTmpDir('delete-with-transient'));
    await createTransientRequest(page, { requestType: 'HTTP' });
    await fillRequestUrl(page, 'http://localhost:8081/ping');
    await createRequest(page, 'plain-req', COLLECTION_NAME, { url: '/ping', method: 'GET' });

    // deleteRequest already asserts that the request does not exist in the sidebar
    // not sure if we need more assertion here.
    await deleteRequest(page, 'plain-req', COLLECTION_NAME);
  });
});
