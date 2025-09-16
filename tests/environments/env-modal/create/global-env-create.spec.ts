import { test, expect } from '../../../../playwright';
import path from 'path';

test.describe('Global Environment Create Tests', () => {
  test('should import collection and create global environment for request usage', async ({ pageWithUserData: page, createTmpDir }) => {
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

    await page.locator('#collection-location').fill(await createTmpDir('global-env-test'));
    await page.getByRole('button', { name: 'Import', exact: true }).click();

    // Verify: Collection was imported successfully
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Test Collection' })).toBeVisible();

    // Configure the imported collection
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Test Collection' }).click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Test: Create global environment and add variables
    await page.locator('[data-testid="environment-selector-trigger"]').click();

    // Switch to Global tab
    await page.locator('[data-testid="env-tab-global"]').click();

    // Verify the Global tab is active
    await expect(page.locator('[data-testid="env-tab-global"]')).toHaveClass(/active/);

    // Create new global environment
    await page.locator('[data-testid="create-global-env-button"]').click();

    // Fill environment name
    const environmentNameInput = page.locator('input[name="name"]');
    await expect(environmentNameInput).toBeVisible();
    await environmentNameInput.fill('Test Global Environment');
    await page.getByRole('button', { name: 'Create' }).click();

    // Wait for the newly created environment to be selected and environment details to load
    await page.waitForSelector('[data-testid="add-variable-button"]', { state: 'visible' });

    // Add global environment variables
    // Add host variable (matches {{host}} in requests)
    await page.locator('[data-testid="add-variable-button"]').click();
    await page.locator('input[name="0.name"]').fill('host');
    await page.locator('.CodeMirror').first().click();
    await page.keyboard.type('https://jsonplaceholder.typicode.com');

    // Add userId variable (matches {{userId}} in requests)
    await page.locator('[data-testid="add-variable-button"]').click();
    await page.locator('input[name="1.name"]').fill('userId');
    await page.locator('.CodeMirror').nth(1).click();
    await page.keyboard.type('1');

    // Add apiKey variable (matches {{apiKey}} in requests)
    await page.locator('[data-testid="add-variable-button"]').click();
    await page.locator('input[name="2.name"]').fill('apiKey');
    await page.locator('.CodeMirror').nth(2).click();
    await page.keyboard.type('global-api-key-12345');
    await page.locator('[data-testid="add-variable-button"]').click();
    await page.locator('input[name="3.name"]').fill('postTitle');
    await page.locator('.CodeMirror').nth(3).click();
    await page.keyboard.type('Global Test Post from Environment');

    // Add postBody variable for request body
    await page.locator('[data-testid="add-variable-button"]').click();
    await page.locator('input[name="4.name"]').fill('postBody');
    await page.locator('.CodeMirror').nth(4).click();
    await page.keyboard.type('This is a global test post body with environment variables');

    // Add a secret global API token
    await page.locator('[data-testid="add-variable-button"]').click();
    await page.locator('input[name="5.name"]').fill('secretApiToken');
    await page.locator('.CodeMirror').nth(5).click();
    await page.keyboard.type('global-secret-token-67890');
    // Mark this variable as secret
    await page.locator('input[name="5.secret"]').check();

    // Verify secret variable is marked correctly
    await expect(page.locator('input[name="5.secret"]')).toBeChecked();

    // Save the global environment with variables
    await page.locator('[data-testid="save-env-button"]').click();

    // Close the environment modal
    await page.getByText('×').click();

    // Verify: Global environment was created successfully and is now active
    // The environment selector should show "Test Global Environment" as the currently selected global environment
    await expect(page.locator('.current-environment')).toContainText('Test Global Environment');

    // Test: Use global environment in GET request
    // Click on the first request that uses environment variables
    await page.locator('.collection-item-name').first().click();

    // Verify: Request URL shows the environment variables are being used
    await expect(page.locator('#request-url .CodeMirror-line')).toContainText('{{host}}/posts/{{userId}}');

    // Test: Send GET request to verify global environment variables work
    // Click on the arrow icon specifically (it has no conflicting click handlers)
    await page.locator('[data-testid="send-arrow-icon"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="send-arrow-icon"]').click();

    // Wait for response and verify it was successful (indicating environment variables were resolved)
    await page.locator('[data-testid="response-status-code"]').waitFor({ state: 'visible' });
    await expect(page.locator('[data-testid="response-status-code"]')).toContainText('200');

    // Test: Use global environment variables in POST request with body
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
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Test Collection' }).click();
    await page.locator('.collection-name').filter({ has: page.locator('#sidebar-collection-name:has-text("Environment Test Collection")') }).locator('.collection-actions').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Close' }).click();
    await page.getByRole('button', { name: 'Close' }).click();
    
    await page.locator('.bruno-logo').click();
  });
});