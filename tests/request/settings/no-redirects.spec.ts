import { test, expect } from '../../../playwright';

test.describe('No Redirects Settings Tests', () => {
  test('should configure and test no redirects settings', async ({
    pageWithUserData: page
  }) => {
    // Navigate to the test collection and request
    await expect(page.locator('#sidebar-collection-name').getByText('settings-test')).toBeVisible();

    await page.locator('#sidebar-collection-name').getByText('settings-test').click();

    // Navigate to the no-redirects request
    await page.getByRole('complementary').getByText('no-redirects').click();

    // Go to Settings tab
    await page.getByRole('tab', { name: 'Settings' }).click();

    // Test No Redirects Settings
    const maxRedirectsInput = page.locator('input[id="maxRedirects"]');
    await expect(maxRedirectsInput).toBeVisible();

    // Verify default value from .bru file (5)
    await expect(maxRedirectsInput).toHaveValue('5');

    // Test Follow Redirects toggle - should be unchecked
    const followRedirectsToggle = page.getByTestId('follow-redirects-toggle');
    await expect(followRedirectsToggle).toBeVisible();
    await expect(followRedirectsToggle).not.toBeChecked();

    // Send the request - should stop at first redirect (302) without following
    await page.getByTestId('send-arrow-icon').click();

    // Should get 302 because redirects are disabled, regardless of maxRedirects value
    await expect(page.getByTestId('response-status-code')).toContainText('302', { timeout: 15000 });

    // Toggle follow redirects to true
    await followRedirectsToggle.click();
    await expect(followRedirectsToggle).toBeChecked();

    // Send request again - now should follow redirects and get 200
    await page.getByTestId('send-arrow-icon').click();
    await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    // Close the single open tab
    await page.locator('.close-icon-container').click();
    await page.locator('button:has-text("Don\'t Save")').first().click();
  });
});
