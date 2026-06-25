import { test, expect } from '../../../playwright';
import * as path from 'path';
import { openCollection, closeAllCollections, getEnvVarValueLine } from '../../utils/page/actions';

test.describe('Import Insomnia v4 Collection - Environment Import', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });
  /**
   * Tests Insomnia v4 environment import with nested data flattening and environment merging.
   * Verifies that base and sub-environments are imported correctly with JavaScript-style keys
   * (e.g., user.name, user.roles[0]) and proper value inheritance/overrides.
   *
   * Test Structure:
   * - Base Environment: Contains nested objects, arrays, and primitive values
   * - Staging Environment: Overrides some base values, inherits others
   * - Development Environment: Adds new variables while inheriting base values
   */
  test('Import Insomnia v4 collection with nested environments and verify flattening', async ({
    page,
    createTmpDir
  }) => {
    const insomniaFile = path.resolve(__dirname, 'fixtures', 'insomnia-v4-with-envs.json');

    await test.step('Import Insomnia v4 collection with environments', async () => {
      await page.getByTestId('collections-header-add-menu').click();
      await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

      const importModal = page.getByTestId('import-collection-modal');
      await importModal.waitFor({ state: 'visible' });
      await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

      await page.setInputFiles('input[type="file"]', insomniaFile);

      const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
      await locationModal.waitFor({ state: 'visible', timeout: 10000 });

      await expect(locationModal.getByText('Test API Collection v4 with Environments')).toBeVisible();

      await page.locator('#collection-location').fill(await createTmpDir('insomnia-v4-env-test'));
      await locationModal.getByRole('button', { name: 'Import' }).click();
      await locationModal.waitFor({ state: 'hidden' });

      await expect(page.locator('#sidebar-collection-name').getByText('Test API Collection v4 with Environments')).toBeVisible();

      await openCollection(page, 'Test API Collection v4 with Environments');
    });

    await test.step('Open collection environments panel', async () => {
      await page.getByTestId('environment-selector-trigger').click();
      await page.getByTestId('env-tab-collection').click();
      await page.getByRole('button', { name: 'Configure' }).click();
    });

    await test.step('Verify all environments are present', async () => {
      await expect(page
        .locator('div')
        .filter({ hasText: /^Base Environment$/ })
        .first()).toBeVisible();
      await expect(page
        .locator('div')
        .filter({ hasText: /^Staging$/ })
        .first()).toBeVisible();
      await expect(page
        .locator('div')
        .filter({ hasText: /^Development$/ })
        .first()).toBeVisible();
    });

    await test.step('Test Base Environment - verify flattened keys', async () => {
      await page
        .locator('div')
        .filter({ hasText: /^Base Environment$/ })
        .first()
        .click();

      // **Assertion 1: Basic Variables (Top-level keys)**
      // Verifies that simple key-value pairs from the base environment are imported correctly
      await expect(await getEnvVarValueLine(page, 'baseUrl')).toHaveText('https://api.example.com');
      await expect(await getEnvVarValueLine(page, 'authToken')).toHaveText('your_auth_token_here');

      // **Assertion 2: Nested Object Flattening**
      // Verifies that nested objects are flattened to dot-notation keys (e.g., user.name, user.id)
      await expect(await getEnvVarValueLine(page, 'user.name')).toHaveText('admin');
      // Numeric values are converted to strings and preserved
      await expect(await getEnvVarValueLine(page, 'user.id')).toHaveText('123');

      // **Assertion 3: Array Flattening**
      // Verifies that arrays are flattened using JavaScript-style square bracket notation (e.g., user.roles[0], user.roles[1])
      await expect(await getEnvVarValueLine(page, 'user.roles[0]')).toHaveText('admin');
      await expect(await getEnvVarValueLine(page, 'user.roles[1]')).toHaveText('user');
    });

    await test.step('Test Staging Environment - verify merging with base', async () => {
      await page
        .locator('div')
        .filter({ hasText: /^Staging$/ })
        .first()
        .click();

      // **Assertion 1: Top-level Variable Override**
      // Verifies that staging environment overrides base environment values
      await expect(await getEnvVarValueLine(page, 'baseUrl')).toHaveText('https://staging-api.example.com');

      // **Assertion 2: Top-level Variable Inheritance**
      // Staging inherits authToken from base (not overridden in staging)
      await expect(await getEnvVarValueLine(page, 'authToken')).toHaveText('your_auth_token_here');

      // **Assertion 3: Nested Object Variable Override and Inheritance**
      // Verifies that nested object properties can be selectively overridden while inheriting others
      // Staging overrides user.name with its own value
      await expect(await getEnvVarValueLine(page, 'user.name')).toHaveText('staging_admin');
      // Staging inherits user.id from base (not overridden in staging)
      await expect(await getEnvVarValueLine(page, 'user.id')).toHaveText('123');
      // Staging inherits user.roles[0] from base (not overridden in staging)
      await expect(await getEnvVarValueLine(page, 'user.roles[0]')).toHaveText('admin');
    });

    await test.step('Test Development Environment - verify new variables', async () => {
      await page
        .locator('div')
        .filter({ hasText: /^Development$/ })
        .first()
        .click();

      // **Assertion 1: Multiple Top-level Variable Overrides**
      // Verifies that development environment can override multiple base environment values
      await expect(await getEnvVarValueLine(page, 'baseUrl')).toHaveText('https://dev-api.example.com');
      await expect(await getEnvVarValueLine(page, 'authToken')).toHaveText('dev_token_123');

      // **Assertion 2: New Nested Variables Addition**
      // Verifies that development environment can add completely new nested variables not present in base
      // New boolean variable is added and converted to string
      await expect(await getEnvVarValueLine(page, 'newFeature.enabled')).toHaveText('true');
      // New numeric variable is added and converted to string with full precision
      await expect(await getEnvVarValueLine(page, 'newFeature.version')).toHaveText('2.099123123');
    });

    await test.step('Close environment tab', async () => {
      const envTab = page.locator('.request-tab').filter({ hasText: 'Environments' });
      await envTab.hover();
      await envTab.getByTestId('request-tab-close-icon').click({ force: true });
    });
  });
});
