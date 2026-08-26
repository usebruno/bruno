import { test, expect } from '../../playwright';
import { closeAllCollections, createCollection, createRequest, sendRequest } from '../utils/page/actions';

test.describe('Large response media preview', () => {
  test.setTimeout(2 * 60 * 1000);

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('PNG preview uses protocol path without Large Response Warning', async ({ page, createTmpDir }) => {
    const collectionName = 'large-media-png';
    await createCollection(page, collectionName, await createTmpDir(collectionName));
    await createRequest(page, 'png', collectionName, {
      url: 'http://localhost:8081/api/large-payload/png'
    });

    await sendRequest(page, 200);

    await expect(page.getByText('Large Response Warning')).toHaveCount(0);
    await expect(page.getByTestId('response-preview-container')).toBeVisible({ timeout: 60000 });
    // Image preview should render an img (protocol or data URL)
    await expect(page.getByTestId('response-preview-container').locator('img')).toBeVisible({ timeout: 60000 });
  });
});
