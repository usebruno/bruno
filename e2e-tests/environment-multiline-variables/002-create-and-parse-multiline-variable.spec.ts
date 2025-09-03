import { test, expect } from '../../playwright';

test.describe('Multiline Variables - Create and Parse Test', () => {
  test('should create and use multiline environment variable dynamically', async ({ pageWithUserData: page }) => {
    test.setTimeout(60 * 1000);

    // Step 1: Initialize collection (handle both fresh and configured states)
    await page.locator('#sidebar-collection-name').click();

    // Wait for any dialogs to appear and handle them
    await page.waitForTimeout(1500);

    // Handle collection security dialog if it appears
    const safeModeLabel = page.getByLabel('Safe Mode');
    const safeModeRadio = page.getByRole('radio', { name: 'Safe Mode' });
    const saveButton = page.getByRole('button', { name: 'Save' });

    if (await safeModeLabel.isVisible()) {
      await safeModeLabel.check();
      await saveButton.click();
    } else if (await safeModeRadio.isVisible()) {
      await safeModeRadio.click();
      await saveButton.click();
    }
    // If neither is visible, collection is already configured

        // Step 2: Handle environment selection and setup (from main collection view)
    // Ensure Test environment is selected before configuring variables
    const noEnvButton = page.getByText('No Environment');
    const testEnvButton = page.locator('.current-environment').filter({ hasText: /Test/ });

    if (await noEnvButton.isVisible()) {
      // Environment not set, select Test
      await noEnvButton.click();
      await page.locator('.dropdown-item').filter({ hasText: 'Test' }).click();
    } else if (await testEnvButton.isVisible()) {
      // Test environment already selected, continue
      console.log('Test environment already selected');
    } else {
      // Try to find and select Test environment from dropdown
      try {
        await page.locator('.environment-selector').click({ timeout: 2000 });
        await page.locator('.dropdown-item').filter({ hasText: 'Test' }).click();
      } catch {
        console.log('Environment setup complete');
      }
    }

    // Step 3: Open environment configuration to create the multiline variable
    // Handle different ways the environment dropdown might appear
    try {
      await page.locator('.current-environment').filter({ hasText: /Test/ }).click();
      await page.getByText('Configure', { exact: true }).click();
    } catch {
      // Alternative approach if the above fails
      try {
        await page.locator('.environment-selector').click();
        await page.getByText('Configure', { exact: true }).click();
      } catch {
        // If configure is already visible, just click it
        await page.getByText('Configure', { exact: true }).click();
      }
    }

    // Step 4: Create the multiline environment variable
    await page.getByRole('button', { name: /Add.*Variable/i }).click();

    // Wait for the form to appear
    await page.waitForTimeout(1000);

    // Add multiline JSON value first
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

    // Fill the value textarea first (we know this works)
    const valueInput = page.locator('textarea').last();
    await valueInput.fill(jsonValue);

    // Navigate backwards to the name input using Shift+Tab
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.type('multiline_data_json');

    // Save the environment variable
    await page.getByRole('button', { name: /Save/i }).click();

    // Close environment config
    await page.getByText('×').click();

    // Step 5: Navigate to multiline-test request and verify variable usage
    // (The request is already configured to use {{multiline_data_json}})
    await page.getByText('multiline-test', { exact: true }).click();

    // Wait for request to load
    await page.waitForTimeout(1000);

    // Verify the variable is visible in the request body (use .first() to avoid strict mode violation)
    await expect(page.getByText('{{multiline_data_json}}').first()).toBeVisible();

    // Step 6: Execute request and verify multiline JSON parsing
    await page.locator('#send-request').getByRole('img').nth(2).click();

    // Wait for response and verify success
    await expect(page.getByText('200')).toBeVisible({ timeout: 15000 });

    // Wait for response body to load
    await page.waitForTimeout(2000);

    // Verify that the multiline JSON was properly sent and echoed back
    // The response should contain the JSON values we sent (use .first() to avoid strict mode violations)
    await expect(page.getByText('John Doe').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('john@example.com').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('dark').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('2025-09-03').first()).toBeVisible({ timeout: 5000 });

    // Also verify the structure was preserved (look for JSON structure indicators)
    await expect(page.getByText('user').first()).toBeVisible();
    await expect(page.getByText('preferences').first()).toBeVisible();
    await expect(page.getByText('metadata').first()).toBeVisible();

    // Cleanup: Remove the multiline_data_json variable from the Test.bru file
    // This is much more reliable than trying to navigate the UI
  });

  // After the test, clean up the file
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
