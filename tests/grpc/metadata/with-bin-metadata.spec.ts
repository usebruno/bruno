import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';

test.describe('grpc metadata', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('should handle binary metadata', async ({ pageWithUserData: page }) => {
    await test.step('Open the request', async () => {
      const collection = page.locator('#sidebar-collection-name').filter({ hasText: 'Grpcbin' });
      await collection.click();
      const request = page.locator('.collection-item-name').filter({ hasText: 'SayHello' });
      await request.click();
    });

    await test.step('Verify request sent successfully', async () => {
      await page.getByTestId('grpc-send-request-button').click();
      const statusCode = page.getByTestId('grpc-response-status-code');
      const statusText = page.getByTestId('grpc-response-status-text');
      await expect(statusCode).toBeVisible({ timeout: 30000 });
      await expect(statusText).toBeVisible({ timeout: 30000 });
      await expect(statusCode).toHaveText(/0/);
      await expect(statusText).toHaveText(/OK/);
    });

    /* TODO: Reflection fetching incorrectly marks requests as modified, causing save indicators to appear. This save step prevents test timeouts by clearing the modified state. This is a temporary workaround until the reflection fetching issue is resolved. */
    await test.step('save request via shortcut', async () => {
      await page.keyboard.press('Meta+s');
    });
  });
});
