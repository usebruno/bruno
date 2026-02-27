import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';

test.describe('Global Environment Configuration Selection Tests', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

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

    const envTab = page.locator('.request-tab').filter({ hasText: 'Global Environments' });
    await expect(envTab).toBeVisible();

    const activeEnvItem = page.locator('.environment-item.active');
    await expect(activeEnvItem).toContainText(currentEnvName);

    await envTab.hover();
    await envTab.getByTestId('request-tab-close-icon').click({ force: true });
  });
});
