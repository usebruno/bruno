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

    // Verify the config modal opens with the currently active environment selected
    const collectionEnvModal = page.locator('.bruno-modal').filter({ hasText: 'Environments' });
    await expect(collectionEnvModal).toBeVisible();

    // Check that the active environment in the config matches prod
    const activeEnvItem = collectionEnvModal.locator('.environment-item.active');
    await expect(activeEnvItem).toContainText('prod');

    // Close the collection environment config modal
    await page.getByText('×').click();
  });
});
