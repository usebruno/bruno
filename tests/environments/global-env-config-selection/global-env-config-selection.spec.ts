import { test, expect } from '../../../playwright';

test.describe('Global Environment Configuration Selection Tests', () => {
  test('should open global environment config with currently active environment selected', async ({
    pageWithUserData: page
  }) => {
    // Open the collection from sidebar
    await page.locator('#sidebar-collection-name').filter({ hasText: 'global-env-config-selection' }).click();

    // Get the currently active environment name
    const currentEnvName = await page.locator('.current-environment').textContent() as string;

    // Open global environment configuration
    await page.getByTestId('environment-selector-trigger').click();
    await page.getByTestId('env-tab-global').click();
    await page.getByText('Configure', { exact: true }).click();

    // Verify the config modal opens with the currently active environment selected
    const globalEnvModal = page.locator('.bruno-modal').filter({ hasText: 'Global Environments' });
    await expect(globalEnvModal).toBeVisible();

    // Check that the active environment in the config matches the current environment
    const activeEnvItem = globalEnvModal.locator('.environment-item.active');
    await expect(activeEnvItem).toContainText(currentEnvName);

    // Close the global environment config modal and go to welcome page
    await page.getByText('×').click();
    await page.locator('.bruno-logo').click();
  });
});
