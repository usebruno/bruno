import { test, expect } from '../../playwright';
import { closeAllCollections, createCollection, createRequest, sendRequest } from '../utils/page/actions';

test.describe('Large response text window', () => {
  test.setTimeout(2 * 60 * 1000);

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('over-cap JSON loads more content as the editor is scrolled', async ({ page, createTmpDir }) => {
    const collectionName = 'large-json-window';
    await createCollection(page, collectionName, await createTmpDir(collectionName));
    await createRequest(page, 'big-json', collectionName, {
      url: 'http://localhost:8081/api/large-payload/json?size=15728640'
    });

    await sendRequest(page, 200);

    await expect(page.getByText('Large Response Warning')).toHaveCount(0);
    await expect(page.getByTestId('response-preview-container')).toBeVisible({ timeout: 90000 });
    await expect(page.getByTestId('response-preview-container')).toContainText('"ok":true', { timeout: 90000 });
    await expect(page.getByRole('button', { name: /Load more/i })).toHaveCount(0);

    const initialLength = await page.locator('.CodeMirror-code').evaluate((el) => el.textContent?.length ?? 0);

    await page.locator('.CodeMirror-scroll').evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    await expect.poll(async () => {
      return page.locator('.CodeMirror-code').evaluate((el) => el.textContent?.length ?? 0);
    }, { timeout: 30000 }).toBeGreaterThan(initialLength);
  });
});
