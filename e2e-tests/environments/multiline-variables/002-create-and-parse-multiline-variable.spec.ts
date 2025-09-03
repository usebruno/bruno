import { test, expect } from '../../../playwright';

test.describe('Multiline Variables - Create and Parse Test', () => {
  test('should create and use multiline environment variable dynamically', async ({ pageWithUserData: page }) => {
    test.setTimeout(60 * 1000);

        // Step 1: Wait for collection to be loaded and click it
    await expect(page.locator('#sidebar-collection-name')).toBeVisible();
    await page.locator('#sidebar-collection-name').click();

    // Step 2: Collection is already configured from previous test - no dialog appears
    // Wait for collection to be ready by checking if requests are visible
    await expect(page.getByText('multiline-test', { exact: true })).toBeVisible();

    // Step 3: Check environment state (Test environment should already be selected)

    // Step 4: Handle environment selection based on current state
    const noEnvButton = page.getByText('No Environment');
    const currentEnv = page.locator('.current-environment').filter({ hasText: /Test/ });

    // Wait for either "No Environment" or current environment to be visible
    await expect(noEnvButton.or(currentEnv)).toBeVisible();

    // If "No Environment" is visible, select Test environment
    if (await noEnvButton.isVisible()) {
      await noEnvButton.click();
      await expect(page.locator('.dropdown-item').filter({ hasText: 'Test' })).toBeVisible();
      await page.locator('.dropdown-item').filter({ hasText: 'Test' }).click();
    }

    // Step 5: Wait for Test environment to be active
    await expect(page.locator('.current-environment').filter({ hasText: /Test/ })).toBeVisible();

    // Step 6: Open environment configuration
    await page.locator('.current-environment').filter({ hasText: /Test/ }).click();
    await expect(page.getByText('Configure', { exact: true })).toBeVisible();
    await page.getByText('Configure', { exact: true }).click();

    // Step 7: Wait for environment config dialog and add variable
    await expect(page.getByRole('button', { name: /Add.*Variable/i })).toBeVisible();
    await page.getByRole('button', { name: /Add.*Variable/i }).click();

    // Step 8: Wait for variable form and fill it
    const valueTextarea = page.locator('textarea').last();
    await expect(valueTextarea).toBeVisible();

    const jsonValue = `{
  "user": {
    "name": "John Doe",
    "email": "john@example.com",
    "preferences": {
      "theme": "dark",
      "notifications": true
    }
  },
  "metadata": {
    "created": "2025-09-03",
    "version": "1.0"
  }
}`;

    // Fill variable form
    await valueTextarea.fill(jsonValue);
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.type('multiline_data_json');

    // Step 9: Save variable and close config
    const saveVarButton = page.getByRole('button', { name: /Save/i });
    await expect(saveVarButton).toBeVisible();
    await saveVarButton.click();

    await expect(page.getByText('×')).toBeVisible();
    await page.getByText('×').click();

    // Step 10: Navigate to multiline-test request
    await expect(page.getByText('multiline-test', { exact: true })).toBeVisible();
    await page.getByText('multiline-test', { exact: true }).click();

    // Step 11: Verify variable is visible in request body
    await expect(page.getByText('{{multiline_data_json}}').first()).toBeVisible();

    // Step 12: Execute request
    const sendButton = page.locator('#send-request').getByRole('img').nth(2);
    await expect(sendButton).toBeVisible();
    await sendButton.click();

    // Step 13: Wait for response status
    await expect(page.getByText('200')).toBeVisible();

    // Step 14: Verify multiline JSON variable resolution in response
    await expect(page.getByRole('main')).toContainText('John Doe');
    await expect(page.getByRole('main')).toContainText('john@example.com');
    await expect(page.getByRole('main')).toContainText('dark');
    await expect(page.getByRole('main')).toContainText('2025-09-03');
    await expect(page.getByRole('main')).toContainText('httpfaker.org');
  });

  // Clean up created variable after test
  test.afterEach(async () => {
    const fs = require('fs');
    const path = require('path');

    const testBruPath = path.join(__dirname, 'collection/environments/Test.bru');
    let content = fs.readFileSync(testBruPath, 'utf8');

    // Remove the multiline_data_json variable and its content
    content = content.replace(/\s*multiline_data_json:\s*'''\s*[\s\S]*?\s*'''/g, '');

    fs.writeFileSync(testBruPath, content);
  });
});