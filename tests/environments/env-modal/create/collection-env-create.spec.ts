import { test, expect } from '../../../../playwright';
import path from 'path';

test.describe('Collection Environment Create Tests', () => {
  test('should import collection and create environment for request usage', async ({
    pageWithUserData: page,
    createTmpDir
  }) => {
    const testDataDir = path.join(__dirname, '../../data');
    const openApiFile = path.join(testDataDir, 'test-collection.json');

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

    await page.locator('#collection-location').fill(await createTmpDir('env-test'));
    await page.getByRole('button', { name: 'Import', exact: true }).click();

    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Test Collection' })).toBeVisible();

    // Configure collection
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Test Collection' }).click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Create environment
    await page.locator('[data-testid="environment-selector-trigger"]').click();
    await expect(page.locator('[data-testid="env-tab-collection"]')).toHaveClass(/active/);

    // Create new environment
    await page.locator('[data-testid="create-collection-env-button"]').click();

    // Fill environment name
    const environmentNameInput = page.locator('input[name="name"]');
    await expect(environmentNameInput).toBeVisible();
    await environmentNameInput.fill('Test Environment');
    await page.getByRole('button', { name: 'Create' }).click();

    // Add environment variables
    await page.locator('[data-testid="add-variable-button"]').click();
    await page.locator('input[name="0.name"]').fill('host');
    await page.locator('.CodeMirror').first().click();
    await page.keyboard.type('https://jsonplaceholder.typicode.com');

    // Add apiKey
    await page.locator('[data-testid="add-variable-button"]').click();
    await page.locator('input[name="1.name"]').fill('apiKey');
    await page.locator('.CodeMirror').nth(1).click();
    await page.keyboard.type('test-api-key-123');

    // Add userId
    await page.locator('[data-testid="add-variable-button"]').click();
    await page.locator('input[name="2.name"]').fill('userId');
    await page.locator('.CodeMirror').nth(2).click();
    await page.keyboard.type('1');

    // Add postTitle
    await page.locator('[data-testid="add-variable-button"]').click();
    await page.locator('input[name="3.name"]').fill('postTitle');
    await page.locator('.CodeMirror').nth(3).click();
    await page.keyboard.type('Test Post from Environment');

    // Add postBody
    await page.locator('[data-testid="add-variable-button"]').click();
    await page.locator('input[name="4.name"]').fill('postBody');
    await page.locator('.CodeMirror').nth(4).click();
    await page.keyboard.type('This is a test post body with environment variables');

    // Add secret token
    await page.locator('[data-testid="add-variable-button"]').click();
    await page.locator('input[name="5.name"]').fill('secretApiToken');
    await page.locator('.CodeMirror').nth(5).click();
    await page.keyboard.type('super-secret-token-12345');
    await page.locator('input[name="5.secret"]').check();
    await expect(page.locator('input[name="5.secret"]')).toBeChecked();

    // Save environment
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByText('×').click();
    await expect(page.locator('.current-environment')).toContainText('Test Environment');

    // Test GET request with environment variables
    await page.locator('.collection-item-name').first().click();
    await expect(page.locator('#request-url .CodeMirror-line')).toContainText('{{host}}/posts/{{userId}}');
    await page.locator('[data-testid="send-arrow-icon"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="send-arrow-icon"]').click();
    await page.locator('[data-testid="response-status-code"]').waitFor({ state: 'visible' });
    await expect(page.locator('[data-testid="response-status-code"]')).toContainText('200');

    // Test POST request with body variables
    await page.locator('.collection-item-name').nth(1).click();
    await expect(page.locator('#request-url .CodeMirror-line')).toContainText('{{host}}/posts');
    await page.locator('[data-testid="send-arrow-icon"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="send-arrow-icon"]').click();
    await page.locator('[data-testid="response-status-code"]').waitFor({ state: 'visible' });
    await expect(page.locator('[data-testid="response-status-code"]')).toContainText('201');

    // Cleanup
    await page.locator('.collection-name').filter({ has: page.locator('#sidebar-collection-name:has-text("Environment Test Collection")') }).locator('.collection-actions').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Close' }).click();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.locator('.bruno-logo').click();
  });
});
