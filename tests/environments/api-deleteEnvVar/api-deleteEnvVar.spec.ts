import { test, expect } from '../../../playwright';
import { sendRequest } from '../../utils/page';

test.describe.serial('bru.deleteEnvVar(name)', () => {
  test('should remove ephemeral variable from UI after deletion', async ({ pageWithUserData: page }) => {
    // Select the collection and request
    await page.locator('#sidebar-collection-name').click();
    await page.getByText('api-deleteEnvVar', { exact: true }).click();

    // open environment dropdown
    await page.getByTestId('environment-selector-trigger').click();

    // select stage environment
    await expect(page.locator('.environment-list .dropdown-item', { hasText: 'Stage' })).toBeVisible();
    await page.locator('.environment-list .dropdown-item', { hasText: 'Stage' }).click();
    await expect(page.locator('.current-environment', { hasText: 'Stage' })).toBeVisible();

    // Send the request (sets and then deletes the variable)
    await sendRequest(page, 200);

    // Verify variable is removed from UI
    await page.getByTestId('environment-selector-trigger').click();
    await page.locator('#configure-env').click();

    const envTab = page.locator('.request-tab').filter({ hasText: 'Environments' });
    await expect(envTab).toBeVisible();

    // Variable should not be visible in the UI
    await expect(page.locator('.table-container tbody')).not.toContainText('tempToken');

    await envTab.hover();
    await envTab.getByTestId('request-tab-close-icon').click();
  });
});
