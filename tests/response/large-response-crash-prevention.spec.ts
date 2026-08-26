import { test, expect } from '../../playwright';
import { closeAllCollections, createCollection, createRequest, sendRequest } from '../utils/page/actions';

const UNDER_100MB_URL = 'http://localhost:8081/api/large-payload?size=15728640'; // 15 MB
const OVER_100MB_URL = 'http://localhost:8081/api/large-payload?size=110100480'; // ~105 MB

test.describe('Large response handling', () => {
  test.setTimeout(3 * 60 * 1000);

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('under 100MB text shows in response pane without Large Response Warning', async ({ page, createTmpDir }) => {
    const collectionName = 'large-under-threshold';
    await createCollection(page, collectionName, await createTmpDir(collectionName));
    await createRequest(page, 'mid-large', collectionName, { url: UNDER_100MB_URL });

    await sendRequest(page, 200);

    await expect(page.getByText('Large Response Warning')).toHaveCount(0);
    await expect(page.getByTestId('response-preview-container')).toBeVisible({ timeout: 90000 });
    await expect(page.getByTestId('response-preview-container')).toContainText('bruno large payload', { timeout: 90000 });
  });

  test('over 100MB text shows Large Response Warning with download', async ({ page, createTmpDir }) => {
    const collectionName = 'large-over-threshold';
    await createCollection(page, collectionName, await createTmpDir(collectionName));
    await createRequest(page, 'huge-text', collectionName, { url: OVER_100MB_URL });

    await sendRequest(page, 200);

    await expect(page.getByText('Large Response Warning')).toBeVisible({ timeout: 120000 });
    await expect(page.getByRole('button', { name: /Download/i })).toBeVisible();
    await expect(page.getByTestId('response-preview-container')).toHaveCount(0);
  });
});
