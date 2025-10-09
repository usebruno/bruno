import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';

test.describe('Timeout Settings Tests', () => {
  test('should configure and test timeout settings', async ({
    pageWithUserData: page
  }) => {
    // Navigate to the test collection and request
    await expect(page.locator('#sidebar-collection-name').getByText('settings-test')).toBeVisible();

    await page.locator('#sidebar-collection-name').getByText('settings-test').click();
    // Navigate to thetimeout request
    await page.getByRole('complementary').getByText('timeout-test').click();

    // Go to Settings tab
    await page.getByRole('tab', { name: 'Settings' }).click();

    // Test Timeout Settings with custom value
    const timeoutInput = page.locator('input[id="timeout"]');
    await expect(timeoutInput).toBeVisible();

    // Verify default value from .bru file (5)
    await expect(timeoutInput).toHaveValue('5');

    await page.getByTestId('send-arrow-icon').click();

    const responsePane = page.locator('.response-pane');
    await expect(responsePane).toContainText('timeout of 5ms exceeded');

    // Now test inherit functionality
    // Click the X button to reset to inherit
    const resetButton = page.locator('button[title="Reset to inherit"]');
    await expect(resetButton).toBeVisible();
    await resetButton.click();

    // After reset, should see "Inherit" button instead of input
    const inheritButton = page.locator('button:has-text("Inherit")');
    await expect(inheritButton).toBeVisible();
    await expect(timeoutInput).not.toBeVisible();

    // Run the request with inherit timeout
    await page.getByTestId('send-arrow-icon').click();

    // Verify the request runs successfully with inherited timeout (should not timeout)
    await expect(responsePane).toContainText('302');

    // Close without saving to avoid modifying the .bru file
    await page.locator('.close-icon-container').click();
    await page.locator('button:has-text("Don\'t Save")').first().click();
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    // Close the single open tab
    await closeAllCollections(page);
  });
});
