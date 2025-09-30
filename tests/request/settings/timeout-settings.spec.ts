import { test, expect } from '../../../playwright';

test.describe('Request Settings Tests', () => {
  test('should configure and test timeout, max redirects, and follow redirects settings', async ({
    pageWithUserData: page
  }) => {
    // Navigate to the test collection and request
    await expect(page.locator('#sidebar-collection-name').getByText('settings-test')).toBeVisible();

    await page.locator('#sidebar-collection-name').getByText('settings-test').click();
    // Navigate to the timeout-test request
    await page.getByRole('complementary').getByText('timeout-test').click();

    // Go to Settings tab
    await page.getByRole('tab', { name: 'Settings' }).click();

    // Test Timeout Settings
    const timeoutInput = page.locator('input[id="timeout"]');
    await expect(timeoutInput).toBeVisible();

    // Verify default value from .bru file (5)
    await expect(timeoutInput).toHaveValue('5');

    await page.locator('[data-testid="send-arrow-icon"]').click();

    const responsePane = page.locator('.response-pane');
    await expect(responsePane).toContainText('timeout of 5ms exceeded');
  });
});
