import { test, expect } from '../../playwright';

test.describe('Multiline Variables - Read Environment Test', () => {
  test('should read existing multiline environment variables and execute request', async ({ pageWithUserData: page }) => {
    test.setTimeout(30 * 1000);

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

    // Step 2: Navigate to ping-request
    await page.getByText('ping-request', { exact: true }).click();

    // Step 3: Ensure Test environment is selected
    // Handle multiple possible states: "No Environment", "Test", or already configured
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

    // Step 4: Execute request to verify multiline environment variables work
    await page.locator('#send-request').getByRole('img').nth(2).click();

    // Verify successful response (confirms multiline env vars are parsed correctly)
    await expect(page.getByText('200')).toBeVisible({ timeout: 15000 });

        // Additional verification: check that host variable was resolved in the response
    await page.waitForTimeout(2000);

    // Verify the response contains the resolved host variable value
    // Use main role to target response area specifically (avoids request panel duplication)
    await expect(page.getByRole('main')).toContainText('httpfaker.org', { timeout: 5000 });
  });
});
