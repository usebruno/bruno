import { test, expect } from '../../../../playwright';
import path from 'path';

test.describe('Collection Environment Import Tests', () => {
  test('should import collection environment from file', async ({ pageWithUserData: page, createTmpDir }) => {
    const testDataDir = path.join(__dirname, '../../data');
    const openApiFile = path.join(testDataDir, 'test-collection.json');
    const envFile = path.join(testDataDir, 'test-collection-env.json');

    // Setup: Import a test collection
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

    // Verify: Collection was imported successfully
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Test Collection' })).toBeVisible();

    // Configure the imported collection
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Test Collection' }).click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Test: Import collection environment
    await page.locator('[data-testid="environment-selector-trigger"]').click();

    // Verify the Collection tab is active by default
    await expect(page.locator('[data-testid="env-tab-collection"]')).toHaveClass(/active/);

    // Import collection environment
    await page.locator('[data-testid="import-collection-env-button"]').click();

    // Verify import modal is visible
    const importEnvModal = page.locator('[data-testid="import-environment-modal"]');
    await expect(importEnvModal).toBeVisible();

    // Click the import button which will trigger file dialog
    // Set up file chooser handler before clicking
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[data-testid="import-postman-environment-button"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(envFile);

    // Wait for import to complete and environment to appear
    await expect(page.locator('.current-environment')).toContainText('Test Collection Environment');

    // Verify imported environment variables are present
    await expect(page.locator('input[name="0.name"]')).toHaveValue('host');
    await expect(page.locator('input[name="1.name"]')).toHaveValue('userId');
    await expect(page.locator('input[name="2.name"]')).toHaveValue('apiKey');
    await expect(page.locator('input[name="3.name"]')).toHaveValue('postTitle');
    await expect(page.locator('input[name="4.name"]')).toHaveValue('postBody');
    await expect(page.locator('input[name="5.name"]')).toHaveValue('secretApiToken');

    // Verify secret variable is marked correctly
    await expect(page.locator('input[name="5.secret"]')).toBeChecked();

    // Close environment settings
    await page.getByText('×').click();

    // Test: Use imported environment in GET request
    // Click on the first request that uses environment variables
    await page.locator('.collection-item-name').first().click();

    // Verify: Request URL shows the environment variables are being used
    await expect(page.locator('#request-url .CodeMirror-line')).toContainText('{{host}}/posts/{{userId}}');

    // Test: Send GET request to verify imported environment variables work
    await page.locator('[data-testid="send-arrow-icon"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="send-arrow-icon"]').click();

    // Wait for response and verify it was successful
    await page.locator('[data-testid="response-status-code"]').waitFor({ state: 'visible' });
    await expect(page.locator('[data-testid="response-status-code"]')).toContainText('200');

    // Test: Use imported environment in POST request
    await page.locator('.collection-item-name').nth(1).click();

    // Verify: Request URL shows the host variable
    await expect(page.locator('#request-url .CodeMirror-line')).toContainText('{{host}}/posts');

    // Test: Send POST request to verify body variables work
    await page.locator('[data-testid="send-arrow-icon"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="send-arrow-icon"]').click();

    // Wait for response and verify it was successful
    await page.locator('[data-testid="response-status-code"]').waitFor({ state: 'visible' });
    await expect(page.locator('[data-testid="response-status-code"]')).toContainText('201');

    // Cleanup: Close the imported collection
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Test Collection' }).click();
    await page.locator('.collection-name').filter({ has: page.locator('#sidebar-collection-name:has-text("Environment Test Collection")') }).locator('.collection-actions').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Close' }).click();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.locator('.bruno-logo').click();
  });
});
