import { test, expect } from '../../../playwright';
import path from 'path';
import { closeAllCollections } from '../../utils/page';

test.describe('Collection Environment Import Tests', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should import collection environment from file', async ({ page, createTmpDir }) => {
    const openApiFile = path.join(__dirname, 'fixtures', 'collection.json');
    const envFile = path.join(__dirname, 'fixtures', 'collection-env.json');

    // Import test collection
    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    const importModal = page.locator('[data-testid="import-collection-modal"]');
    await importModal.waitFor({ state: 'visible' });

    await page.setInputFiles('input[type="file"]', openApiFile);

    const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
    await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');
    await expect(locationModal.getByText('Environment Test Collection')).toBeVisible();

    // Select a location and import
    await page.locator('#collection-location').fill(await createTmpDir('collection-env-import-test'));
    await locationModal.getByRole('button', { name: 'Import' }).click();
    await locationModal.waitFor({ state: 'hidden' });

    await expect(
      page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Test Collection' })).toBeVisible({ timeout: 10000 });

    // Configure collection
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Test Collection' }).click();

    // Import collection environment
    await page.locator('[data-testid="environment-selector-trigger"]').click();
    await expect(page.locator('[data-testid="env-tab-collection"]')).toHaveClass(/active/);
    await page.locator('button[id="import-env"]').click();
    const importEnvModal = page.locator('[data-testid="import-environment-modal"]');
    await expect(importEnvModal).toBeVisible();

    // Import environment file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('import-environment').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(envFile);

    // Wait for import to complete and environment settings modal to open
    await expect(page.locator('.current-environment')).toContainText('Test Collection Environment');

    const envTab = page.locator('.request-tab').filter({ hasText: 'Environments' });
    await expect(envTab).toBeVisible();

    // Environment variables table uses react-virtuoso (virtual scroll),
    // so only visible rows are in the DOM. Verify first visible batch,
    // then scroll to reveal the rest.
    const envNameInputs = page.locator('input[name$=".name"]');
    await expect(envNameInputs.nth(0)).toHaveValue('host');
    await expect(envNameInputs.nth(1)).toHaveValue('userId');
    await expect(envNameInputs.nth(2)).toHaveValue('apiKey');

    // Scroll the virtualized table to reveal remaining rows
    await page.locator('.table-container').evaluate((el) => el.scrollTop = el.scrollHeight);

    await expect(page.locator('input[name$=".name"][value="postTitle"]')).toBeVisible();
    await expect(page.locator('input[name$=".name"][value="postBody"]')).toBeVisible();
    await expect(page.locator('input[name$=".name"][value="secretApiToken"]')).toBeVisible();
    await expect(page.locator('input[name="5.secret"]')).toBeChecked();
    await envTab.hover();
    await envTab.getByTestId('request-tab-close-icon').click({ force: true });

    await page.locator('.collection-item-name').first().click();
    await expect(page.locator('#request-url .CodeMirror-line')).toContainText('{{host}}/posts/{{userId}}');
    await page.locator('[data-testid="send-arrow-icon"]').click();
    await page.locator('[data-testid="response-status-code"]').waitFor({ state: 'visible' });
    await expect(page.locator('[data-testid="response-status-code"]')).toContainText('200');

    // Verify the JSON response contains the interpolated userId
    const responsePane = page.locator('.response-pane');
    await expect(responsePane).toContainText('"userId": 1');

    // Test POST request
    await page.locator('.collection-item-name').nth(1).click();
    await expect(page.locator('#request-url .CodeMirror-line')).toContainText('{{host}}/posts');
    await page.locator('[data-testid="send-arrow-icon"]').click();
    await page.locator('[data-testid="response-status-code"]').waitFor({ state: 'visible' });
    await expect(page.locator('[data-testid="response-status-code"]')).toContainText('201');
  });
});
