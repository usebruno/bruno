import { test, expect } from '../../playwright';
import { closeAllCollections, createCollection, createRequest, sendRequest } from '../utils/page/actions';

const LARGE_TEXT_URL = 'http://localhost:8081/api/large-payload?size=15728640';
const SMALL_TEXT_URL = 'http://localhost:8081/api/large-payload?size=1048576';

test.describe('Large response handling', () => {
  test.setTimeout(2 * 60 * 1000);

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('under-threshold text shows in response pane without Large Response Warning', async ({ page, createTmpDir }) => {
    const collectionName = 'large-under-threshold';
    await createCollection(page, collectionName, await createTmpDir(collectionName));
    await createRequest(page, 'small-large', collectionName, { url: SMALL_TEXT_URL });

    await sendRequest(page, 200);

    await expect(page.getByText('Large Response Warning')).toHaveCount(0);
    await expect(page.getByTestId('response-preview-container')).toBeVisible({ timeout: 60000 });
    await expect(page.getByTestId('response-preview-container')).toContainText('bruno large payload', { timeout: 60000 });
  });

  test('over 10MB text auto-previews without Large Response Warning', async ({ page, createTmpDir }) => {
    const collectionName = 'large-over-threshold';
    await createCollection(page, collectionName, await createTmpDir(collectionName));
    await createRequest(page, 'big-text', collectionName, { url: LARGE_TEXT_URL });

    await sendRequest(page, 200);

    await expect(page.getByText('Large Response Warning')).toHaveCount(0);
    await expect(page.getByTestId('response-preview-container')).toBeVisible({ timeout: 90000 });
    // Windowed first chunk should still show the filler prefix
    await expect(page.getByTestId('response-preview-container')).toContainText('bruno large payload', { timeout: 90000 });
  });
});
