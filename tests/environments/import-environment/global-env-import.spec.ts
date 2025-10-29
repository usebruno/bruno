import { test, expect } from '../../../playwright';
import path from 'path';

test.describe('Global Environment Import Tests', () => {
  test('should import global environment from file', async ({ page, createTmpDir }) => {
    const openApiFile = path.join(__dirname, 'fixtures', 'collection.json');
    const globalEnvFile = path.join(__dirname, 'fixtures', 'global-env.json');

    // Import test collection
    await page.getByRole('button', { name: 'Import Collection' }).click();

    const importModal = page.locator('[data-testid="import-collection-modal"]');
    await importModal.waitFor({ state: 'visible' });

    await page.setInputFiles('input[type="file"]', openApiFile);
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
    await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');
    await expect(locationModal.getByText('Environment Test Collection')).toBeVisible();

    await page.locator('#collection-location').fill(await createTmpDir('global-env-import-test'));
    await page.getByRole('button', { name: 'Import', exact: true }).click();

    await expect(
      page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Test Collection' })
    ).toBeVisible();

    // Configure collection
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Test Collection' }).click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Import global environment
    await page.locator('[data-testid="environment-selector-trigger"]').click();
    await page.locator('[data-testid="env-tab-global"]').click();
    await expect(page.locator('[data-testid="env-tab-global"]')).toHaveClass(/active/);
    await page.locator('button[id="import-env"]').click();
    const importGlobalEnvModal = page.locator('[data-testid="import-global-environment-modal"]');
    await expect(importGlobalEnvModal).toBeVisible();

    // Import environment file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button[data-testid="import-postman-global-environment"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(globalEnvFile);

    // Wait for import to complete and global environment settings modal to open
    await expect(page.locator('.current-environment')).toContainText('Test Global Environment');

    // The global environment settings modal should now be visible with the imported environment
    const globalEnvSettingsModal = page.locator('.bruno-modal').filter({ hasText: 'Global Environments' });
    await expect(globalEnvSettingsModal).toBeVisible();

    // Verify imported variables in Test Global Environment settings
    await expect(globalEnvSettingsModal.locator('input[name="0.name"]')).toHaveValue('host');
    await expect(globalEnvSettingsModal.locator('input[name="1.name"]')).toHaveValue('userId');
    await expect(globalEnvSettingsModal.locator('input[name="2.name"]')).toHaveValue('apiKey');
    await expect(globalEnvSettingsModal.locator('input[name="3.name"]')).toHaveValue('postTitle');
    await expect(globalEnvSettingsModal.locator('input[name="4.name"]')).toHaveValue('postBody');
    await expect(globalEnvSettingsModal.locator('input[name="5.name"]')).toHaveValue('secretApiToken');
    await expect(globalEnvSettingsModal.locator('input[name="5.secret"]')).toBeChecked();
    await page.getByText('×').click();

    // Test GET request with global environment
    await page.locator('#collection-environment-test-collection .collection-item-name').first().click();
    await expect(page.locator('#request-url .CodeMirror-line')).toContainText('{{host}}/posts/{{userId}}');
    await page.locator('[data-testid="send-arrow-icon"]').click();
    await page.locator('[data-testid="response-status-code"]').waitFor({ state: 'visible' });
    await expect(page.locator('[data-testid="response-status-code"]')).toContainText('200');

    // Verify the JSON response contains the interpolated userId
    const responsePane = page.locator('.response-pane');
    await expect(responsePane).toContainText('"userId": 1');

    // Test POST request
    await page.locator('#collection-environment-test-collection .collection-item-name').nth(1).click();
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
  });
});
