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

    // Poll until the SSE connection is established
    await expect.poll(async () => {
      const response = await page.request.get('http://localhost:8081/api/sse/connections');
      const data = await response.json();
      return data.activeConnections;
    }, { timeout: 5000 }).toBe(1);

    // Resend the request (this should cancel the old connection and start a new one)
    const resendShortcut = process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter';
    await page.keyboard.press(resendShortcut);

    // Poll until the old connection is closed and a new one is established
    await expect.poll(async () => {
      const response = await page.request.get('http://localhost:8081/api/sse/connections');
      const data = await response.json();
      return data.activeConnections;
    }, { timeout: 5000 }).toBe(1);
  });
});
