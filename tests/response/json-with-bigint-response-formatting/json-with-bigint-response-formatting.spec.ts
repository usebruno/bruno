import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';

test.describe.serial('JSON Response Formatting with BigInt', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('should handle BigInt values in JSON response formatting', async ({ pageWithUserData: page }) => {
    await test.step('Navigate to collection and request', async () => {
      // Navigate to the test collection
      await expect(page.locator('#sidebar-collection-name').getByText('bigint-test')).toBeVisible();
      await page.locator('#sidebar-collection-name').getByText('bigint-test').click();

      // Navigate to the bigint request
      await page.getByRole('complementary').getByText('bigint-request').click();
    });

    await test.step('Send request and verify response', async () => {
      // Send the request
      await page.getByTestId('send-arrow-icon').click();

      // Wait for response
      await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });

      // Verify the response is properly formatted JSON
      const responseBody = page.locator('.response-pane');
      await expect(responseBody).toBeVisible();

      // The response should echo back our request data
      await expect(responseBody).toContainText('"data": 1736184243098437392');
    });
  });
});
