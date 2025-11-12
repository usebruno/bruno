import { test, expect } from '../../playwright';
import { createCollection, closeAllCollections } from '../utils/page';

test.describe('Variable Tooltip', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should test tooltip functionality with environment variables', async ({ page, createTmpDir }) => {
    const collectionName = 'tooltip-test';

    await test.step('Create collection and add environment variables', async () => {
      await createCollection(page, collectionName, await createTmpDir('tooltip-collection'), {
        openWithSandboxMode: 'safe'
      });
      await expect(page.locator('#sidebar-collection-name').filter({ hasText: collectionName })).toBeVisible();

      // Open environment settings
      await page.locator('[data-testid="environment-selector-trigger"]').click();
      await expect(page.locator('[data-testid="env-tab-collection"]')).toHaveClass(/active/);

      // Create environment
      await page.locator('button[id="create-env"]').click();
      await page.locator('input[name="name"]').fill('Test Env');
      await page.getByRole('button', { name: 'Create' }).click();

      // Add apiKey variable
      await page.locator('button[data-testid="add-variable"]').click();
      await page.locator('input[name="0.name"]').fill('apiKey');
      await page.locator('tr').filter({ has: page.locator('input[name="0.name"]') }).locator('.CodeMirror').click();
      await page.keyboard.type('test-key-123');

      // Add secretToken variable
      await page.locator('button[data-testid="add-variable"]').click();
      await page.locator('input[name="1.name"]').fill('secretToken');
      await page.locator('tr').filter({ has: page.locator('input[name="1.name"]') }).locator('.CodeMirror').click();
      await page.keyboard.type('secret-xyz');
      await page.locator('input[name="1.secret"]').check();

      // Save and close
      await page.getByRole('button', { name: 'Save' }).click();
      await page.getByText('×').click();
    });

    await test.step('Create request and test tooltip', async () => {
      // Create request
      const collectionContainer = page.locator('.collection-name').filter({ hasText: collectionName });
      await collectionContainer.locator('.collection-actions').hover();
      await collectionContainer.locator('.collection-actions .icon').click();
      await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();

      await page.getByPlaceholder('Request Name').fill('Test Request');
      await page.locator('#new-request-url .CodeMirror').click();
      await page.locator('textarea').fill('https://api.example.com?key={{apiKey}}');
      await page.getByRole('button', { name: 'Create' }).click();

      // Open request
      await page.locator('.collection-item-name').filter({ hasText: 'Test Request' }).click();
    });

    await test.step('Test basic tooltip', async () => {
      const urlEditor = page.locator('#request-url .CodeMirror');
      const apiKeyVar = urlEditor.locator('.cm-variable-valid').filter({ hasText: 'apiKey' }).first();

      await apiKeyVar.hover();

      const tooltip = page.locator('.CodeMirror-brunoVarInfo').first();
      await expect(tooltip).toBeVisible();
      await expect(tooltip.locator('.var-name')).toContainText('apiKey');
      await expect(tooltip.locator('.var-scope-badge')).toContainText('Environment');
      await expect(tooltip.locator('.var-value-editable-display')).toContainText('test-key-123');
      await expect(tooltip.locator('.copy-button')).toBeVisible();
    });

    await test.step('Test secret variable with toggle', async () => {
      // Add header with secret
      await page.getByRole('tab', { name: 'Headers' }).click();
      await page.locator('button.btn-action').filter({ hasText: 'Add Header' }).click();

      const headerNameEditor = page.locator('table tbody tr').first().locator('td').first().locator('.CodeMirror');
      await headerNameEditor.click();
      await page.keyboard.type('Authorization');

      const headerValueEditor = page.locator('table tbody tr').first().locator('td').nth(1).locator('.CodeMirror');
      await headerValueEditor.click();
      await page.keyboard.type('Bearer {{secretToken}}');
      await page.keyboard.press('Control+s');

      // Test tooltip with secret
      const secretVar = headerValueEditor.locator('.cm-variable-valid').filter({ hasText: 'secretToken' }).first();
      await secretVar.hover();

      const tooltip = page.locator('.CodeMirror-brunoVarInfo').first();
      await expect(tooltip).toBeVisible();

      // Verify masked
      const valueDisplay = tooltip.locator('.var-value-editable-display');
      const maskedText = await valueDisplay.textContent();
      // Check that value is masked (contains bullet points and not the actual value)
      expect(maskedText).not.toContain('secret-xyz');
      expect(maskedText?.length).toBeGreaterThan(0);

      // Test toggle
      const toggleButton = tooltip.locator('.secret-toggle-button');
      await expect(toggleButton).toBeVisible();
      await toggleButton.click();
      await expect(valueDisplay).toContainText('secret-xyz');

      // Toggle back
      await toggleButton.click();
      const remaskedText = await valueDisplay.textContent();
      expect(remaskedText).not.toContain('secret-xyz');
      expect(remaskedText?.length).toBeGreaterThan(0);
    });
  });
});
