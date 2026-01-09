import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';

test.describe('Collection Environment Configuration Selection Tests', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('should open collection environment config with currently active environment selected', async ({
    pageWithUserData: page
  }) => {
    // Open the collection from sidebar
    await page.locator('#sidebar-collection-name').filter({ hasText: 'collection-env-config-selection' }).click();

    // First, select an environment (prod - development)
    await page.getByTestId('environment-selector-trigger').click();
    await page.getByTestId('env-tab-collection').click();

    // Select prod (development environment)
    await page.locator('.dropdown-item').filter({ hasText: 'prod' }).click();

    // Verify environment was selected
    await expect(page.locator('.current-environment')).toContainText('prod');

    // Now open the dropdown again and go to configuration
    await page.getByTestId('environment-selector-trigger').click();
    await page.getByTestId('env-tab-collection').click();
    await page.getByText('Configure', { exact: true }).click();

    const envTab = page.locator('.request-tab').filter({ hasText: 'Environments' });
    await expect(envTab).toBeVisible();

    const activeEnvItem = page.locator('.environment-item.active');
    await expect(activeEnvItem).toContainText('prod');

    await envTab.hover();
    await envTab.getByTestId('request-tab-close-icon').click();
  });
});
