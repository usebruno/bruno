import { test, expect } from '../../../playwright';
import path from 'path';

test.describe('Global Environment Create Tests', () => {
  test('should import collection and create global environment for request usage', async ({
    page,
    createTmpDir
  }) => {
    const openApiFile = path.join(__dirname, 'fixtures', 'bruno-collection.json');

    // Import test collection
    await page.getByRole('button', { name: 'Import Collection' }).click();

    const importModal = page.locator('[data-testid="import-collection-modal"]');
    await importModal.waitFor({ state: 'visible' });

    await page.setInputFiles('input[type="file"]', openApiFile);
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
    await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');
    await expect(locationModal.getByText('test_collection')).toBeVisible();

    await page.locator('#collection-location').fill(await createTmpDir('global-env-test'));
    await page.getByRole('button', { name: 'Import', exact: true }).click();

    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'test_collection' })).toBeVisible();

    // Configure collection
    await page.locator('#sidebar-collection-name').filter({ hasText: 'test_collection' }).click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Create global environment
    await page.locator('[data-testid="environment-selector-trigger"]').click();
    await page.locator('[data-testid="env-tab-global"]').click();
    await expect(page.locator('[data-testid="env-tab-global"]')).toHaveClass(/active/);

    // Create new global environment
    await page.locator('button[id="create-env"]').click();

    // Fill environment name
    const environmentNameInput = page.locator('input[name="name"]');
    await expect(environmentNameInput).toBeVisible();
    await environmentNameInput.fill('Test Global Environment');
    await page.getByRole('button', { name: 'Create' }).click();

    // Add environment variables
    await page.locator('button[data-testid="add-variable"]').click();
    await page.locator('input[name="0.name"]').fill('host');
    await page
      .locator('tr')
      .filter({ has: page.locator('input[name="0.name"]') })
      .locator('.CodeMirror')
      .click();
    await page.keyboard.type('https://echo.usebruno.com');

    // Add userId
    await page.locator('button[data-testid="add-variable"]').click();
    await page.locator('input[name="1.name"]').fill('userId');
    await page
      .locator('tr')
      .filter({ has: page.locator('input[name="1.name"]') })
      .locator('.CodeMirror')
      .click();
    await page.keyboard.type('1');

    // Add postTitle
    await page.locator('button[data-testid="add-variable"]').click();
    await page.locator('input[name="2.name"]').fill('postTitle');
    await page
      .locator('tr')
      .filter({ has: page.locator('input[name="2.name"]') })
      .locator('.CodeMirror')
      .click();
    await page.keyboard.type('Global Test Post from Environment');

    // Add postBody
    await page.locator('button[data-testid="add-variable"]').click();
    await page.locator('input[name="3.name"]').fill('postBody');
    await page
      .locator('tr')
      .filter({ has: page.locator('input[name="3.name"]') })
      .locator('.CodeMirror')
      .click();
    await page.keyboard.type('This is a global test post body with environment variables');

    // Add secret token
    await page.locator('button[data-testid="add-variable"]').click();
    await page.locator('input[name="4.name"]').fill('secretApiToken');
    await page
      .locator('tr')
      .filter({ has: page.locator('input[name="4.name"]') })
      .locator('.CodeMirror')
      .click();
    await page.keyboard.type('global-secret-token-12345');
    await page.locator('input[name="4.secret"]').check();
    await expect(page.locator('input[name="4.secret"]')).toBeChecked();

    // Save environment
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByText('×').click();
    await expect(page.locator('.current-environment')).toContainText('Test Global Environment');

    // Test GET request with environment variables
    await page.locator('.collection-item-name').first().click();
    await expect(page.locator('#request-url .CodeMirror-line')).toContainText('{{host}}');
    await page.locator('[data-testid="send-arrow-icon"]').click();
    await page.locator('[data-testid="response-status-code"]').waitFor({ state: 'visible' });
    await expect(page.locator('[data-testid="response-status-code"]')).toContainText('200');

    // Verify the JSON response contains the environment variables
    const responsePane = page.locator('.response-pane');
    await expect(responsePane).toContainText('"userId": 1');
    await expect(responsePane).toContainText('"title": "Global Test Post from Environment"');
    await expect(responsePane).toContainText('"body": "This is a global test post body with environment variables"');
    await expect(responsePane).toContainText('"apiToken": "global-secret-token-12345"');

    // Cleanup
    await page
      .locator('.collection-name')
      .filter({ has: page.locator('#sidebar-collection-name:has-text("test_collection")') })
      .locator('.collection-actions')
      .click();
    await page.locator('.dropdown-item').filter({ hasText: 'Close' }).click();
    // Scope the Close button to the confirmation modal to avoid matching the dropdown close button
    // Wait for the confirmation modal with "Close Collection" title to appear
    const closeModal = page.getByRole('dialog').filter({ has: page.getByText('Close Collection') });
    await closeModal.getByRole('button', { name: 'Close' }).click();

    await page.locator('.bruno-logo').click();
  });
});
