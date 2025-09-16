import { test, expect } from '../../../../playwright';
import path from 'path';

test.describe('Collection Environment Create Tests', () => {
  test('should import collection and create environment for request usage', async ({
    pageWithUserData: page,
    createTmpDir
  }) => {
    const testDataDir = path.join(__dirname, '../../data');
    const openApiFile = path.join(testDataDir, 'test-collection.json');

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

    await page.locator('#collection-location').fill(await createTmpDir('env-test'));
    await page.getByRole('button', { name: 'Import', exact: true }).click();

    // Verify: Collection was imported successfully
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Test Collection' })).toBeVisible();

    // Configure the imported collection
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Test Collection' }).click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Test: Create environment and add variables
    await page.locator('[data-testid="environment-selector-trigger"]').click();

    // Verify the Collection tab is active by default
    await expect(page.locator('[data-testid="env-tab-collection"]')).toHaveClass(/active/);

    // Create new environment
    await page.locator('[data-testid="create-collection-env-button"]').click();

    // Fill environment name
    const environmentNameInput = page.locator('input[name="name"]');
    await expect(environmentNameInput).toBeVisible();
    await environmentNameInput.fill('Test Environment');
    await page.getByRole('button', { name: 'Create' }).click();

    // Add environment variables during creation
    // Add first variable - host/baseUrl
    await page.locator('[data-testid="add-variable-button"]').click();
    await page.locator('input[name="0.name"]').fill('host');
    await page.locator('.CodeMirror').first().click();
    await page.keyboard.type('https://jsonplaceholder.typicode.com');

    // Add apiKey variable
    await page.locator('[data-testid="add-variable-button"]').click();
    await page.locator('input[name="1.name"]').fill('apiKey');
    await page.locator('.CodeMirror').nth(1).click();
    await page.keyboard.type('test-api-key-123');

    // Add userId variable
    await page.locator('[data-testid="add-variable-button"]').click();
    await page.locator('input[name="2.name"]').fill('userId');
    await page.locator('.CodeMirror').nth(2).click();
    await page.keyboard.type('1');

    // Add postTitle variable for request body
    await page.locator('[data-testid="add-variable-button"]').click();
    await page.locator('input[name="3.name"]').fill('postTitle');
    await page.locator('.CodeMirror').nth(3).click();
    await page.keyboard.type('Test Post from Environment');

    // Add postBody variable for request body
    await page.locator('[data-testid="add-variable-button"]').click();
    await page.locator('input[name="4.name"]').fill('postBody');
    await page.locator('.CodeMirror').nth(4).click();
    await page.keyboard.type('This is a test post body with environment variables');

    // Add a secret variable - API token
    await page.locator('[data-testid="add-variable-button"]').click();
    await page.locator('input[name="5.name"]').fill('secretApiToken');
    await page.locator('.CodeMirror').nth(5).click();
    await page.keyboard.type('super-secret-token-12345');
    // Mark this variable as secret
    await page.locator('input[name="5.secret"]').check();

    // Verify secret variable is marked correctly
    await expect(page.locator('input[name="5.secret"]')).toBeChecked();

    // Save the environment with variables
    await page.getByRole('button', { name: 'Save' }).click();

    //close the environment modal
    await page.getByText('×').click();

    // Verify: Environment was created successfully and is now active
    // The environment selector should show "Test Environment" as the currently selected environment
    await expect(page.locator('.current-environment')).toContainText('Test Environment');

    // Test: Use environment in GET request
    // Click on the first request that uses environment variables
    await page.locator('.collection-item-name').first().click();

    // Verify: Request URL shows the environment variables are being used
    await expect(page.locator('#request-url .CodeMirror-line')).toContainText('{{host}}/posts/{{userId}}');

    // Click on the arrow icon specifically (it has no conflicting click handlers)
    await page.locator('[data-testid="send-arrow-icon"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="send-arrow-icon"]').click();

    // Wait for response and verify it was successful (indicating environment variables were resolved)
    await page.locator('[data-testid="response-status-code"]').waitFor({ state: 'visible' });
    await expect(page.locator('[data-testid="response-status-code"]')).toContainText('200');

    // Test: Use environment variables in POST request with body
    // Click on the second request that uses body variables
    await page.locator('.collection-item-name').nth(1).click();

    // Verify: Request URL shows the host variable
    await expect(page.locator('#request-url .CodeMirror-line')).toContainText('{{host}}/posts');

    // Test: Send POST request to verify body variables work
    // Click on the arrow icon specifically (it has no conflicting click handlers)
    await page.locator('[data-testid="send-arrow-icon"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="send-arrow-icon"]').click();

    // Wait for response and verify it was successful
    await page.locator('[data-testid="response-status-code"]').waitFor({ state: 'visible' });
    await expect(page.locator('[data-testid="response-status-code"]')).toContainText('201');

    // Cleanup: Close the imported collection
    await page.locator('.collection-name').filter({ has: page.locator('#sidebar-collection-name:has-text("Environment Test Collection")') }).locator('.collection-actions').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Close' }).click();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.locator('.bruno-logo').click();
  });
});
