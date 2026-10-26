import { test, expect } from '../../../playwright';
import { openCollection, openRequest, sendRequest } from '../../utils/page';

const COLLECTION_NAME = 'network-log-scroll';
const REQUEST_NAME = 'network-log-scroll';

test.describe('DevTools Network Tab Clear', () => {
  test('clears every network request row from the Network tab', async ({ pageWithUserData: page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Send a request so the Network tab has an entry', async () => {
      await openCollection(page, COLLECTION_NAME);
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await sendRequest(page, 200);
    });

    await test.step('Open DevTools → Network and confirm the request is listed', async () => {
      await page.locator('button[data-trigger="dev-tools"]').click();
      await expect(page.locator('.console-header')).toBeVisible();

      const networkTab = page.locator('.console-tab').filter({ hasText: 'Network' });
      await networkTab.click();
      await expect(networkTab).toHaveClass(/active/);

      await expect(page.getByTestId('network-request-row').first()).toBeVisible();
    });

    await test.step('Clear the network requests from the tab controls', async () => {
      const clearButton = page.getByTestId('clear-network-logs');
      await expect(clearButton).toBeVisible();
      await clearButton.click();

      await expect(page.getByTestId('network-request-row')).toHaveCount(0);
      await expect(page.getByText('No network requests')).toBeVisible();
    });
  });
});
