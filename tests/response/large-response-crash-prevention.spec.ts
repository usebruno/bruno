import { test, expect } from '../../playwright';
import { closeAllCollections, createCollection, createRequest, sendRequest } from '../utils/page/actions';
import { buildPreferencesLocators, setMaxPreviewSizePreference } from '../utils/page/preferences';

const MB = 1024 * 1024;
const largePayloadUrl = (bytes: number) => `http://localhost:8081/api/large-payload?size=${bytes}`;

test.describe('Large Response Crash/High Memory Usage Prevention', () => {
  test.afterEach(async ({ page }) => {
    await setMaxPreviewSizePreference(page, 10);
    await closeAllCollections(page);
  });

  test('Show warning for responses over the max preview size', async ({ page, createTmpDir }) => {
    await createCollection(page, 'size-warning-test', await createTmpDir('size-warning-test'));
    await createRequest(page, 'large-response', 'size-warning-test', { url: largePayloadUrl(11 * MB) });
    await sendRequest(page, 200);

    await expect(page.getByText('Large Response Warning')).toBeVisible();
    await expect(page.getByText('This response exceeds your configured preview size limit.')).toBeVisible();
    await expect(page.getByTestId('large-response-view')).toBeEnabled();
    await expect(page.getByTestId('large-response-download')).toBeEnabled();
    await expect(page.getByTestId('large-response-copy')).toBeEnabled();
  });

  test('Raising the max preview size reveals the response', async ({ page, createTmpDir }) => {
    await setMaxPreviewSizePreference(page, 1);
    await createCollection(page, 'size-limit-test', await createTmpDir('size-limit-test'));
    await createRequest(page, 'large-response', 'size-limit-test', { url: largePayloadUrl(2 * MB) });
    await sendRequest(page, 200);
    await expect(page.getByText('Large Response Warning')).toBeVisible();

    await setMaxPreviewSizePreference(page, 3);
    await page.locator('.collection-item-name').filter({ hasText: 'large-response' }).click();

    await expect(page.getByText('Large Response Warning')).toHaveCount(0);
    await expect(page.getByTestId('response-preview-container')).toContainText('bruno large payload');
  });

  test('Preferences link opens the General preferences', async ({ page, createTmpDir }) => {
    const preferences = buildPreferencesLocators(page);
    await setMaxPreviewSizePreference(page, 1);
    await createCollection(page, 'size-preferences-test', await createTmpDir('size-preferences-test'));
    await createRequest(page, 'large-response', 'size-preferences-test', { url: largePayloadUrl(2 * MB) });
    await sendRequest(page, 200);

    await page.getByTestId('large-response-open-preferences').click();

    await expect(preferences.openTab()).toBeVisible();
    await expect(preferences.general.maxPreviewSizeInput()).toHaveValue('1');
  });
});
