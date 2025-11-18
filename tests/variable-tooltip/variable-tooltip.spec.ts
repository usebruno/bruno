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
      // Move mouse away to dismiss any active tooltip
      await page.mouse.move(0, 0);

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

  test('should test tooltip with variable references', async ({ page, createTmpDir }) => {
    const collectionName = 'tooltip-reference-test';

    await test.step('Create collection with interdependent variables', async () => {
      await createCollection(page, collectionName, await createTmpDir('tooltip-ref-collection'), {
        openWithSandboxMode: 'safe'
      });
      await expect(page.locator('#sidebar-collection-name').filter({ hasText: collectionName })).toBeVisible();

      // Open environment settings
      await page.locator('[data-testid="environment-selector-trigger"]').click();
      await expect(page.locator('[data-testid="env-tab-collection"]')).toHaveClass(/active/);

      // Create environment
      await page.locator('button[id="create-env"]').click();
      await page.locator('input[name="name"]').fill('Ref Test Env');
      await page.getByRole('button', { name: 'Create' }).click();

      // Add host variable
      await page.locator('button[data-testid="add-variable"]').click();
      await page.locator('input[name="0.name"]').fill('host');
      await page.locator('tr').filter({ has: page.locator('input[name="0.name"]') }).locator('.CodeMirror').click();
      await page.keyboard.type('api.example.com');

      // Add endpoint that references host
      await page.locator('button[data-testid="add-variable"]').click();
      await page.locator('input[name="1.name"]').fill('endpoint');
      await page.locator('tr').filter({ has: page.locator('input[name="1.name"]') }).locator('.CodeMirror').click();
      await page.keyboard.type('https://{{host}}/users');

      // Save and close
      await page.getByRole('button', { name: 'Save' }).click();
      await page.getByText('×').click();
    });

    await test.step('Create request with variable references', async () => {
      const collectionContainer = page.locator('.collection-name').filter({ hasText: collectionName });
      await collectionContainer.locator('.collection-actions').hover();
      await collectionContainer.locator('.collection-actions .icon').click();
      await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();

      await page.getByPlaceholder('Request Name').fill('Ref Test Request');
      await page.locator('#new-request-url .CodeMirror').click();
      await page.locator('textarea').fill('{{endpoint}}');
      await page.getByRole('button', { name: 'Create' }).click();

      await page.locator('.collection-item-name').filter({ hasText: 'Ref Test Request' }).click();
    });

    await test.step('Test variable referencing other variables', async () => {
      const urlEditor = page.locator('#request-url .CodeMirror');
      const endpointVar = urlEditor.locator('.cm-variable-valid').filter({ hasText: 'endpoint' }).first();

      await endpointVar.hover();

      const tooltip = page.locator('.CodeMirror-brunoVarInfo').first();
      await expect(tooltip).toBeVisible();
      await expect(tooltip.locator('.var-name')).toContainText('endpoint');

      // Should show resolved value
      await expect(tooltip.locator('.var-value-editable-display')).toContainText('https://api.example.com/users');

      // Should have copy button
      await expect(tooltip.locator('.copy-button')).toBeVisible();
    });

    await test.step('Test editing variable with references', async () => {
      // Move mouse away to dismiss any active tooltip
      await page.mouse.move(0, 0);

      // URL editor is always visible at the top
      const urlEditor = page.locator('#request-url .CodeMirror');
      const endpointVar = urlEditor.locator('.cm-variable-valid').filter({ hasText: 'endpoint' }).first();

      await endpointVar.hover();

      const tooltip = page.locator('.CodeMirror-brunoVarInfo').first();
      await expect(tooltip).toBeVisible();

      // Click on value to edit
      const valueDisplay = tooltip.locator('.var-value-editable-display');
      await valueDisplay.click();

      // Should show editor with raw value (not resolved)
      const editor = tooltip.locator('.var-value-editor .CodeMirror');
      await expect(editor).toBeVisible();

      // Verify it shows the raw value with variable references
      // focus on the editor
      const editorContent = await editor.locator('.CodeMirror-line').textContent();
      expect(editorContent).toContain('{{host}}');

      // Edit the value
      await page.keyboard.press('End');
      await page.keyboard.type('/posts');

      // Click outside to save
      await page.locator('body').click();

      // Move mouse away and back to get fresh tooltip
      await page.mouse.move(0, 0);

      // Hover again to verify the change
      await endpointVar.hover();

      const newTooltip = page.locator('.CodeMirror-brunoVarInfo').first();
      await expect(newTooltip).toBeVisible();

      // Should show updated resolved value
      await expect(newTooltip.locator('.var-value-editable-display')).toContainText('https://api.example.com/users/posts');
    });

    await test.step('Test copy button', async () => {
      // Move mouse away to dismiss any active tooltip
      await page.mouse.move(0, 0);

      const urlEditor = page.locator('#request-url .CodeMirror');
      const endpointVar = urlEditor.locator('.cm-variable-valid').filter({ hasText: 'endpoint' }).first();

      await endpointVar.hover();

      const tooltip = page.locator('.CodeMirror-brunoVarInfo').first();
      await expect(tooltip).toBeVisible();

      const copyButton = tooltip.locator('.copy-button');
      await expect(copyButton).toBeVisible();

      // Click copy button
      await copyButton.click();

      // Should show success state (checkmark)
      await expect(copyButton.locator('svg polyline')).toBeVisible({ timeout: 1000 });

      // Wait for it to revert back to copy icon
      await expect(copyButton.locator('svg rect')).toBeVisible();
    });
  });

  test('should handle runtime and process.env variables', async ({ page, createTmpDir }) => {
    const collectionName = 'tooltip-readonly-test';

    await test.step('Create collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir('tooltip-readonly-collection'), {
        openWithSandboxMode: 'safe'
      });
      await expect(page.locator('#sidebar-collection-name').filter({ hasText: collectionName })).toBeVisible();

      // Create environment
      await page.locator('[data-testid="environment-selector-trigger"]').click();
      await page.locator('button[id="create-env"]').click();
      await page.locator('input[name="name"]').fill('Readonly Env');
      await page.getByRole('button', { name: 'Create' }).click();
      await page.getByRole('button', { name: 'Save' }).click();
      await page.getByText('×').click();

      // Create request
      const collectionContainer = page.locator('.collection-name').filter({ hasText: collectionName });
      await collectionContainer.locator('.collection-actions').hover();
      await collectionContainer.locator('.collection-actions .icon').click();
      await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();

      await page.getByPlaceholder('Request Name').fill('Readonly Test');
      await page.locator('#new-request-url .CodeMirror').click();
      await page.locator('textarea').fill('https://example.com');
      await page.getByRole('button', { name: 'Create' }).click();

      await page.locator('.collection-item-name').filter({ hasText: 'Readonly Test' }).click();
    });

    await test.step('Test process.env variable tooltip', async () => {
      // Move mouse away to dismiss any active tooltip
      await page.mouse.move(0, 0);

      // Add a process.env variable in URL (URL editor is always visible at the top)
      const urlEditor = page.locator('#request-url .CodeMirror');
      await urlEditor.click();
      await page.keyboard.press('End');
      await page.keyboard.type('?env={{process.env.HOME}}');
      await page.keyboard.press('Control+s');

      // Hover over process.env variable
      const processEnvVar = urlEditor.locator('.cm-variable-valid, .cm-variable-invalid').filter({ hasText: 'process.env.HOME' }).first();
      await processEnvVar.hover();

      const tooltip = page.locator('.CodeMirror-brunoVarInfo').first();
      await expect(tooltip).toBeVisible();
      await expect(tooltip.locator('.var-name')).toContainText('process.env.HOME');
      await expect(tooltip.locator('.var-scope-badge')).toContainText('Process Env');

      // Should show read-only note
      await expect(tooltip.locator('.var-readonly-note')).toContainText('read-only');

      // Should have copy button but not be editable
      await expect(tooltip.locator('.copy-button')).toBeVisible();
      await expect(tooltip.locator('.var-value-editor')).not.toBeVisible();
    });
  });
});
