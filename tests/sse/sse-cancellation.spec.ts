import { test, expect } from '../../playwright';

test.describe('SSE Connection Cancellation', () => {
  test.beforeEach(async ({ pageWithUserData: page }) => {
    // Reset SSE connections before each test
    await page.request.post('http://localhost:8081/api/sse/reset');
  });

  test('should close previous SSE connection when resending request', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').click();

    await page.getByTestId('sidebar-collection-item-row').filter({ hasText: 'sse-stream-request' }).click();

    await page.getByTestId('send-arrow-icon').waitFor({ state: 'visible' });

    await page.getByTestId('send-arrow-icon').click();

    await page.waitForTimeout(1000);

    const initialResponse = await page.request.get('http://localhost:8081/api/sse/connections');
    const initialData = await initialResponse.json();
    expect(initialData.activeConnections).toBe(1);

    // Press Cmd+Enter to resend the request (this should cancel the old connection and start a new one)
    await page.keyboard.press('Meta+Enter');
    await page.waitForTimeout(1500);

    // Verify that only 1 connection is active (old one was closed, new one opened)
    const finalResponse = await page.request.get('http://localhost:8081/api/sse/connections');
    const finalData = await finalResponse.json();

    expect(finalData.activeConnections).toBe(1);
  });
});
