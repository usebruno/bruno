import { test, expect } from '../../../../playwright';
import path from 'path';

test.describe('Collection Environment Import Tests', () => {
  test('should import collection environment from file', async ({ pageWithUserData: page, createTmpDir }) => {
    const testDataDir = path.join(__dirname, '../../data');
    const openApiFile = path.join(testDataDir, 'test-collection.json');
    const envFile = path.join(testDataDir, 'test-collection-env.json');

    // Import test collection
    await page.getByRole('button', { name: 'Import Collection' }).click();

    const importModal = page.locator('[data-testid="import-collection-modal"]');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', openApiFile);
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
    await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');
    await expect(locationModal.getByText('Environment Test Collection')).toBeVisible();

    await page.locator('#collection-location').fill(await createTmpDir('collection-env-import-test'));
    await page.getByRole('button', { name: 'Import', exact: true }).click();

    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Test Collection' })).toBeVisible();

    // Configure collection
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Test Collection' }).click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Import collection environment
    await page.locator('[data-testid="environment-selector-trigger"]').click();
    await expect(page.locator('[data-testid="env-tab-collection"]')).toHaveClass(/active/);
    await page.locator('button[id="import-collection-env"]').click();
    const importEnvModal = page.locator('[data-testid="import-environment-modal"]');
    await expect(importEnvModal).toBeVisible();

    // Import environment file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button[data-testid="import-postman-environment"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(envFile);
    await expect(page.locator('.current-environment')).toContainText('Test Collection Environment');

    // Verify imported variables
    await expect(page.locator('input[name="0.name"]')).toHaveValue('host');
    await expect(page.locator('input[name="1.name"]')).toHaveValue('userId');
    await expect(page.locator('input[name="2.name"]')).toHaveValue('apiKey');
    await expect(page.locator('input[name="3.name"]')).toHaveValue('postTitle');
    await expect(page.locator('input[name="4.name"]')).toHaveValue('postBody');
    await expect(page.locator('input[name="5.name"]')).toHaveValue('secretApiToken');
    await expect(page.locator('input[name="5.secret"]')).toBeChecked();
    await page.getByText('×').click();

    // Test GET request with imported environment
    await page.locator('.collection-item-name').first().click();
    await expect(page.locator('#request-url .CodeMirror-line')).toContainText('{{host}}/posts/{{userId}}');
    await page.locator('[data-testid="send-arrow-icon"]').click();
    await page.locator('[data-testid="response-status-code"]').waitFor({ state: 'visible' });
    await expect(page.locator('[data-testid="response-status-code"]')).toContainText('200');

    // Test POST request
    await page.locator('.collection-item-name').nth(1).click();
    await expect(page.locator('#request-url .CodeMirror-line')).toContainText('{{host}}/posts');
    await page.locator('[data-testid="send-arrow-icon"]').click();
    await page.locator('[data-testid="response-status-code"]').waitFor({ state: 'visible' });
    await expect(page.locator('[data-testid="response-status-code"]')).toContainText('201');

    // Cleanup
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Test Collection' }).click();
    await page.locator('.collection-name').filter({ has: page.locator('#sidebar-collection-name:has-text("Environment Test Collection")') }).locator('.collection-actions').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Close' }).click();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.locator('.bruno-logo').click();
  });
});
