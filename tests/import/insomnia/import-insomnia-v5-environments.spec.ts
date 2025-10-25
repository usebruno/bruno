import { test, expect } from '../../../playwright';
import * as path from 'path';
import { openCollectionAndAcceptSandbox, closeAllCollections } from '../../utils/page/actions';

test.describe('Import Insomnia v5 Collection - Environment Import', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });
  /**
   * Tests Insomnia v5 environment import with nested data flattening and environment merging.
   * Verifies that base and sub-environments are imported correctly with JavaScript-style keys
   * (e.g., user.name, user.roles[0]) and proper value inheritance/overrides.
   *
   * Test Structure:
   * - Base Environment: Contains nested objects, arrays, and primitive values
   * - Staging Environment: Overrides some base values, inherits others
   * - Development Environment: Adds new variables while inheriting base values
   */
  test('Import Insomnia v5 collection with nested environments and verify flattening', async ({
    page,
    createTmpDir
  }) => {
    const insomniaFile = path.resolve(__dirname, 'fixtures', 'insomnia-v5-with-envs.yaml');

    await test.step('Import Insomnia v5 collection with environments', async () => {
      await page.getByRole('button', { name: 'Import Collection' }).click();

      const importModal = page.getByTestId('import-collection-modal');
      await importModal.waitFor({ state: 'visible' });
      await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

      await page.setInputFiles('input[type="file"]', insomniaFile);

      await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

      const locationModal = page.getByTestId('import-collection-location-modal');
      await expect(locationModal.getByText('Test API Collection v5 with Environments')).toBeVisible();

      await page.locator('#collection-location').fill(await createTmpDir('insomnia-v5-env-test'));
      await page.getByRole('button', { name: 'Import', exact: true }).click();

      await expect(page.getByText('Test API Collection v5 with Environments')).toBeVisible();

      await openCollectionAndAcceptSandbox(page, 'Test API Collection v5 with Environments', 'safe');
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
      const baseUrlInput = page.locator('input[value="base_url"]');
      const authTokenInput = page.locator('input[value="auth_token"]');
      await expect(baseUrlInput).toBeVisible();
      await expect(authTokenInput).toBeVisible();

      // Assert: Top-level string values are preserved exactly as in the source
      await expect(page.getByTestId('env-var-row-base_url').locator('.CodeMirror-line').first()).toHaveText('https://api.example.com');
      await expect(page.getByTestId('env-var-row-auth_token').locator('.CodeMirror-line').first()).toHaveText('your_auth_token_here');

      // **Assertion 2: Nested Object Flattening**
      // Verifies that nested objects are flattened to dot-notation keys (e.g., user.name, user.id)
      const userNameInput = page.locator('input[value="user.name"]');
      const userIdInput = page.locator('input[value="user.id"]');
      await expect(userNameInput).toBeVisible();
      await expect(userIdInput).toBeVisible();

      // Assert: Nested object properties are accessible via dot notation
      await expect(page.getByTestId('env-var-row-user.name').locator('.CodeMirror-line').first()).toHaveText('admin');
      // Assert: Numeric values are converted to strings and preserved
      await expect(page.getByTestId('env-var-row-user.id').locator('.CodeMirror-line').first()).toHaveText('123');

      // **Assertion 3: Array Flattening**
      // Verifies that arrays are flattened using JavaScript-style square bracket notation (e.g., user.roles[0], user.roles[1])
      const userRoles0Input = page.locator('input[value="user.roles[0]"]');
      const userRoles1Input = page.locator('input[value="user.roles[1]"]');
      await expect(userRoles0Input).toBeVisible();
      await expect(userRoles1Input).toBeVisible();

      // Assert: Array elements are accessible via JavaScript-style square bracket notation
      await expect(page.getByTestId('env-var-row-user.roles[0]').locator('.CodeMirror-line').first()).toHaveText('admin');
      await expect(page.getByTestId('env-var-row-user.roles[1]').locator('.CodeMirror-line').first()).toHaveText('user');

      // **Assertion 4: Deeply Nested Config Objects**
      // Verifies that deeply nested objects are properly flattened (e.g., config.timeout, config.debug)
      const configTimeoutInput = page.locator('input[value="config.timeout"]');
      const configDebugInput = page.locator('input[value="config.debug"]');
      await expect(configTimeoutInput).toBeVisible();
      await expect(configDebugInput).toBeVisible();

      // Assert: Numeric values in nested objects are converted to strings
      await expect(page.getByTestId('env-var-row-config.timeout').locator('.CodeMirror-line').first()).toHaveText('30000');
      // Assert: Boolean values in nested objects are converted to strings
      await expect(page.getByTestId('env-var-row-config.debug').locator('.CodeMirror-line').first()).toHaveText('true');
    });

    await test.step('Test Staging Environment - verify merging and overrides', async () => {
      await page
        .locator('div')
        .filter({ hasText: /^Staging$/ })
        .first()
        .click();

      // **Assertion 1: Top-level Variable Override**
      // Verifies that staging environment overrides base environment values
      const stagingBaseUrlInput = page.locator('input[value="base_url"]');
      await expect(stagingBaseUrlInput).toBeVisible();
      // Assert: Staging overrides base_url with its own value
      await expect(page.getByTestId('env-var-row-base_url').locator('.CodeMirror-line').first()).toHaveText('https://staging-api.example.com');

      // **Assertion 2: Top-level Variable Inheritance**
      // Verifies that staging environment inherits base environment values when not overridden
      const stagingAuthTokenInput = page.locator('input[value="auth_token"]');
      await expect(stagingAuthTokenInput).toBeVisible();
      // Assert: Staging inherits auth_token from base (not overridden in staging)
      await expect(page.getByTestId('env-var-row-auth_token').locator('.CodeMirror-line').first()).toHaveText('your_auth_token_here');

      // **Assertion 3: Nested Object Variable Override and Inheritance**
      // Verifies that nested object properties can be selectively overridden while inheriting others
      const stagingUserNameInput = page.locator('input[value="user.name"]');
      const stagingUserIdInput = page.locator('input[value="user.id"]');
      await expect(stagingUserNameInput).toBeVisible();
      await expect(stagingUserIdInput).toBeVisible();

      // Assert: Staging overrides user.name with its own value
      await expect(page.getByTestId('env-var-row-user.name').locator('.CodeMirror-line').first()).toHaveText('staging_admin');
      // Assert: Staging inherits user.id from base (not overridden in staging)
      await expect(page.getByTestId('env-var-row-user.id').locator('.CodeMirror-line').first()).toHaveText('123');

      // **Assertion 4: Deeply Nested Config Override**
      // Verifies that deeply nested object properties can be overridden
      const stagingConfigTimeoutInput = page.locator('input[value="config.timeout"]');
      const stagingConfigDebugInput = page.locator('input[value="config.debug"]');
      await expect(stagingConfigTimeoutInput).toBeVisible();
      await expect(stagingConfigDebugInput).toBeVisible();

      // Assert: Staging overrides config.timeout with its own value
      await expect(page.getByTestId('env-var-row-config.timeout').locator('.CodeMirror-line').first()).toHaveText('60000');
      // Assert: Staging overrides config.debug with its own value
      await expect(page.getByTestId('env-var-row-config.debug').locator('.CodeMirror-line').first()).toHaveText('false');
    });

    await test.step('Test Development Environment - verify new variables', async () => {
      await page
        .locator('div')
        .filter({ hasText: /^Development$/ })
        .first()
        .click();

      // **Assertion 1: Multiple Top-level Variable Overrides**
      // Verifies that development environment can override multiple base environment values
      const devBaseUrlInput = page.locator('input[value="base_url"]');
      const devAuthTokenInput = page.locator('input[value="auth_token"]');
      await expect(devBaseUrlInput).toBeVisible();
      await expect(devAuthTokenInput).toBeVisible();

      // Assert: Development overrides base_url with its own value
      await expect(page.getByTestId('env-var-row-base_url').locator('.CodeMirror-line').first()).toHaveText('https://dev-api.example.com');
      // Assert: Development overrides auth_token with its own value
      await expect(page.getByTestId('env-var-row-auth_token').locator('.CodeMirror-line').first()).toHaveText('dev_token_123');

      // **Assertion 2: New Nested Variables Addition**
      // Verifies that development environment can add completely new nested variables not present in base
      const newFeatureEnabledInput = page.locator('input[value="new_feature.enabled"]');
      const newFeatureVersionInput = page.locator('input[value="new_feature.version"]');
      await expect(newFeatureEnabledInput).toBeVisible();
      await expect(newFeatureVersionInput).toBeVisible();

      // Assert: New boolean variable is added and converted to string
      await expect(page.getByTestId('env-var-row-new_feature.enabled').locator('.CodeMirror-line').first()).toHaveText('true');
      // Assert: New numeric variable is added and converted to string with full precision
      await expect(page.getByTestId('env-var-row-new_feature.version').locator('.CodeMirror-line').first()).toHaveText('2.099123123');

      // **Assertion 3: Base Variable Inheritance**
      // Verifies that development environment still inherits base variables that are not overridden
      const devUserRoles0Input = page.locator('input[value="user.roles[0]"]');
      await expect(devUserRoles0Input).toBeVisible();
      // Assert: Development inherits user.roles[0] from base (not overridden in development)
      await expect(page.getByTestId('env-var-row-user.roles[0]').locator('.CodeMirror-line').first()).toHaveText('admin');
    });

    await test.step('Close environment modal', async () => {
      // Close the environment configuration modal to ensure clean state
      await page.getByText('×').click();
    });
  });
});
