import { test, expect } from '../../../playwright';

test.describe('Max Redirects Settings Tests', () => {
  test('should configure and test max redirects settings', async ({
    pageWithUserData: page
  }) => {
    // Navigate to the test collection and request
    await expect(page.locator('#sidebar-collection-name').getByText('settings-test')).toBeVisible();

    await page.locator('#sidebar-collection-name').getByText('settings-test').click();

    // Navigate to the max-redirects-test request
    await page.getByRole('complementary').getByText('max-redirects-test').click();

    // Go to Settings tab
    await page.getByRole('tab', { name: 'Settings' }).click();

    // Test Max Redirects Settings
    const maxRedirectsInput = page.locator('input[id="maxRedirects"]');
    await expect(maxRedirectsInput).toBeVisible();

    // Verify default value from .bru file (1)
    await expect(maxRedirectsInput).toHaveValue('1');

    // Test Follow Redirects toggle
    const followRedirectsToggle = page.locator('[data-testid="follow-redirects-toggle"]');
    await expect(followRedirectsToggle).toBeVisible();
    await expect(followRedirectsToggle).toBeChecked();

    // Send the request
    await page.locator('[data-testid="send-arrow-icon"]').click();

    await expect(page.locator('[data-testid="response-status-code"]')).toContainText('302', { timeout: 15000 });

    // change the max redirects to 2
    await maxRedirectsInput.fill('2');
    await page.locator('[data-testid="send-arrow-icon"]').click();
    await expect(page.locator('[data-testid="response-status-code"]')).toContainText('200', { timeout: 15000 });
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    // Close the single open tab
    await page.locator('.close-icon-container').click();
    await page.locator('button:has-text("Don\'t Save")').first().click();
    await page.locator('.bruno-logo').click();
  });
});
