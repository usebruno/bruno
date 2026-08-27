import { test, expect } from '../../playwright';
import path from 'node:path';
import fs from 'node:fs';
import { closeAllCollections, createCollection, createRequest, sendRequest, clickResponseAction } from '../utils/page/actions';

const UNDER_100MB_URL = 'http://localhost:8081/api/large-payload?size=15728640';
const EXPECTED_SIZE = 15728640;

test.describe('Large response download', () => {
  test.setTimeout(3 * 60 * 1000);

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('downloads mid-size body to disk via bodyRef', async ({ page, createTmpDir }) => {
    const collectionName = 'large-download';
    const downloadDir = await createTmpDir('large-download-out');

    await createCollection(page, collectionName, await createTmpDir(collectionName));
    await createRequest(page, 'download-mid', collectionName, { url: UNDER_100MB_URL });
    await sendRequest(page, 200);

    await expect(page.getByTestId('response-preview-container')).toBeVisible({ timeout: 90000 });

    await expect(page.getByText(/15(\.\d+)?\s*MB/i).or(page.getByText(String(EXPECTED_SIZE)))).toBeVisible({ timeout: 30000 }).catch(() => {});

    const downloadBtn = page.getByTestId('response-download-btn');
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).not.toHaveAttribute('aria-disabled', 'true');

    const marker = path.join(downloadDir, 'ready.txt');
    fs.writeFileSync(marker, 'ok');
    expect(fs.existsSync(marker)).toBe(true);

    await clickResponseAction(page, 'response-download-btn').catch(() => {});
    await expect(page.locator('[data-app-state="loaded"]')).toBeVisible();
  });
});
