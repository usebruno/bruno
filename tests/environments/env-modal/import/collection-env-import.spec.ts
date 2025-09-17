import { test, expect } from '../../../../playwright';
import path from 'path';

test.describe('Collection Environment Import Tests', () => {
  test('should import collection environment from file', async ({ pageWithUserData: page, createTmpDir }) => {
    const openApiFile = path.join(__dirname, 'data', 'collection.json');
    const envFile = path.join(__dirname, 'data', 'collection-env.json');

    // Import test collection
    await page.getByRole('button', { name: 'Import Collection' }).click();

    const importModal = page.locator('[data-testid="import-collection-modal"]');
    await importModal.waitFor({ state: 'visible' });

    await page.setInputFiles('input[type="file"]', openApiFile);
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
    await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');
    await expect(locationModal.getByText('Environment Test Collection')).toBeVisible();

    await page.locator('#collection-location').fill(await createTmpDir('collection-env-import-test'));
    await page.getByRole('button', { name: 'Import', exact: true }).click();

    await expect(
      page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Test Collection' })
    ).toBeVisible();

    // Configure collection
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Test Collection' }).click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Import collection environment
    await page.locator('[data-testid="environment-selector-trigger"]').click();
    await expect(page.locator('[data-testid="env-tab-collection"]')).toHaveClass(/active/);
    await page.locator('button[id="import-env"]').click();
    const importEnvModal = page.locator('[data-testid="import-environment-modal"]');
    await expect(importEnvModal).toBeVisible();

    // Import environment file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button[data-testid="import-postman-environment"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(envFile);

    // Wait for import to complete and environment settings modal to open
    await expect(page.locator('.current-environment')).toContainText('Test Collection Environment');

    // The environment settings modal should now be visible with the imported environment
    const envSettingsModal = page.locator('.bruno-modal').filter({ hasText: 'Environments' });
    await expect(envSettingsModal).toBeVisible();

    // Verify imported variables in Test Collection Environment settings
    await expect(envSettingsModal.locator('input[name="0.name"]')).toHaveValue('host');
    await expect(envSettingsModal.locator('input[name="1.name"]')).toHaveValue('userId');
    await expect(envSettingsModal.locator('input[name="2.name"]')).toHaveValue('apiKey');
    await expect(envSettingsModal.locator('input[name="3.name"]')).toHaveValue('postTitle');
    await expect(envSettingsModal.locator('input[name="4.name"]')).toHaveValue('postBody');
    await expect(envSettingsModal.locator('input[name="5.name"]')).toHaveValue('secretApiToken');
    await expect(envSettingsModal.locator('input[name="5.secret"]')).toBeChecked();
    await page.getByText('×').click();

    // Test GET request with imported environment
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

    // Cleanup
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Test Collection' }).click();
    await page
      .locator('.collection-name')
      .filter({ has: page.locator('#sidebar-collection-name:has-text("Environment Test Collection")') })
      .locator('.collection-actions')
      .click();
    await page.locator('.dropdown-item').filter({ hasText: 'Close' }).click();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.locator('.bruno-logo').click();
  });
});
