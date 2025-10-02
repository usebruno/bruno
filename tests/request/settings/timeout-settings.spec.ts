import { test, expect } from '../../../playwright';

test.describe('Timeout Settings Tests', () => {
  test('should configure and test timeout settings', async ({
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

    await page.getByTestId('send-arrow-icon').click();

    const responsePane = page.locator('.response-pane');
    await expect(responsePane).toContainText('timeout of 5ms exceeded');

    // go to welcome page
    await page.locator('.bruno-logo').click();
  });
});
