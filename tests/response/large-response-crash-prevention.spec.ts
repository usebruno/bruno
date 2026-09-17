import { test, expect } from '../../playwright';
import { closeAllCollections, createCollection, createRequest, sendRequest } from '../utils/page/actions';

const UNDER_10MB_URL = 'http://localhost:8081/api/large-payload?size=5242880'; // 5 MB
const BETWEEN_10_50MB_URL = 'http://localhost:8081/api/large-payload?size=15728640'; // 15 MB
const OVER_50MB_URL = 'http://localhost:8081/api/large-payload?size=57671680'; // ~55 MB

test.describe('Large response handling', () => {
  test.setTimeout(3 * 60 * 1000);

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('under 10MB text shows in response pane without Large Response Warning', async ({ page, createTmpDir }) => {
    const collectionName = 'large-under-show';
    await createCollection(page, collectionName, await createTmpDir(collectionName));
    await createRequest(page, 'small-large', collectionName, { url: UNDER_10MB_URL });

    await sendRequest(page, 200);

    await expect(page.getByText('Large Response Warning')).toHaveCount(0);
    await expect(page.getByTestId('response-preview-container')).toBeVisible({ timeout: 90000 });
    await expect(page.getByTestId('response-preview-container')).toContainText('bruno large payload', { timeout: 90000 });
  });

  test('10–50MB text shows Large Response Warning with View and Download', async ({ page, createTmpDir }) => {
    const collectionName = 'large-viewable';
    await createCollection(page, collectionName, await createTmpDir(collectionName));
    await createRequest(page, 'mid-large', collectionName, { url: BETWEEN_10_50MB_URL });

    await sendRequest(page, 200);

    await expect(page.getByText('Large Response Warning')).toBeVisible({ timeout: 120000 });
    const viewBtn = page.getByRole('button', { name: /^View$/i });
    await expect(viewBtn).toBeVisible();
    await expect(viewBtn).toBeEnabled();
    await expect(page.getByRole('button', { name: /Download/i })).toBeVisible();
    await expect(page.getByTestId('response-preview-container')).toHaveCount(0);

    await viewBtn.click();
    await expect(page.getByTestId('response-preview-container')).toBeVisible({ timeout: 90000 });
    await expect(page.getByTestId('response-preview-container')).toContainText('bruno large payload', { timeout: 90000 });
  });

  test('over 50MB text shows Large Response Warning with Download only', async ({ page, createTmpDir }) => {
    const collectionName = 'large-download-only';
    await createCollection(page, collectionName, await createTmpDir(collectionName));
    await createRequest(page, 'huge-text', collectionName, { url: OVER_50MB_URL });

    await sendRequest(page, 200);

    await expect(page.getByText('Large Response Warning')).toBeVisible({ timeout: 120000 });
    await expect(page.getByRole('button', { name: /Download/i })).toBeVisible();
    const viewBtn = page.getByRole('button', { name: /^View$/i });
    await expect(viewBtn).toBeVisible();
    await expect(viewBtn).toBeDisabled();
    await expect(page.getByTestId('response-preview-container')).toHaveCount(0);
  });
});
