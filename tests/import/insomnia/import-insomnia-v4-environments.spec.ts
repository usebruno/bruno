import { test, expect } from '../../../playwright';
import * as path from 'path';
import { openCollectionAndAcceptSandbox, closeAllCollections } from '../../utils/page/actions';

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
      await page.getByRole('button', { name: 'Import Collection' }).click();

      const importModal = page.getByTestId('import-collection-modal');
      await importModal.waitFor({ state: 'visible' });
      await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

      await page.setInputFiles('input[type="file"]', insomniaFile);

      await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

      const locationModal = page.getByTestId('import-collection-location-modal');
      await expect(locationModal.getByText('Test API Collection v4 with Environments')).toBeVisible();

      await page.locator('#collection-location').fill(await createTmpDir('insomnia-v4-env-test'));
      await page.getByRole('button', { name: 'Import', exact: true }).click();

      await expect(page.getByText('Test API Collection v4 with Environments')).toBeVisible();

      await openCollectionAndAcceptSandbox(page, 'Test API Collection v4 with Environments', 'safe');
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
      const v4BaseUrlInput = page.locator('input[value="baseUrl"]');
      const v4AuthTokenInput = page.locator('input[value="authToken"]');
      await expect(v4BaseUrlInput).toBeVisible();
      await expect(v4AuthTokenInput).toBeVisible();

      const v4BaseUrlRow = v4BaseUrlInput.locator('xpath=ancestor::tr');
      const v4AuthTokenRow = v4AuthTokenInput.locator('xpath=ancestor::tr');
      // Assert: Top-level string values are preserved exactly as in the source
      await expect(v4BaseUrlRow.locator('.CodeMirror-line').first()).toHaveText('https://api.example.com');
      await expect(v4AuthTokenRow.locator('.CodeMirror-line').first()).toHaveText('your_auth_token_here');

      // **Assertion 2: Nested Object Flattening**
      // Verifies that nested objects are flattened to dot-notation keys (e.g., user.name, user.id)
      const v4UserNameInput = page.locator('input[value="user.name"]');
      const v4UserIdInput = page.locator('input[value="user.id"]');
      await expect(v4UserNameInput).toBeVisible();
      await expect(v4UserIdInput).toBeVisible();

      const v4UserNameRow = v4UserNameInput.locator('xpath=ancestor::tr');
      const v4UserIdRow = v4UserIdInput.locator('xpath=ancestor::tr');
      // Assert: Nested object properties are accessible via dot notation
      await expect(v4UserNameRow.locator('.CodeMirror-line').first()).toHaveText('admin');
      // Assert: Numeric values are converted to strings and preserved
      await expect(v4UserIdRow.locator('.CodeMirror-line').first()).toHaveText('123');

      // **Assertion 3: Array Flattening**
      // Verifies that arrays are flattened using JavaScript-style square bracket notation (e.g., user.roles[0], user.roles[1])
      const v4UserRoles0Input = page.locator('input[value="user.roles[0]"]');
      const v4UserRoles1Input = page.locator('input[value="user.roles[1]"]');
      await expect(v4UserRoles0Input).toBeVisible();
      await expect(v4UserRoles1Input).toBeVisible();

      const v4UserRoles0Row = v4UserRoles0Input.locator('xpath=ancestor::tr');
      const v4UserRoles1Row = v4UserRoles1Input.locator('xpath=ancestor::tr');
      // Assert: Array elements are accessible via JavaScript-style square bracket notation
      await expect(v4UserRoles0Row.locator('.CodeMirror-line').first()).toHaveText('admin');
      await expect(v4UserRoles1Row.locator('.CodeMirror-line').first()).toHaveText('user');
    });

    await test.step('Test Staging Environment - verify merging with base', async () => {
      await page
        .locator('div')
        .filter({ hasText: /^Staging$/ })
        .first()
        .click();

      // **Assertion 1: Top-level Variable Override**
      // Verifies that staging environment overrides base environment values
      const v4StagingBaseUrlInput = page.locator('input[value="baseUrl"]');
      await expect(v4StagingBaseUrlInput).toBeVisible();
      const v4StagingBaseUrlRow = v4StagingBaseUrlInput.locator('xpath=ancestor::tr');
      // Assert: Staging overrides baseUrl with its own value
      await expect(v4StagingBaseUrlRow.locator('.CodeMirror-line').first()).toHaveText('https://staging-api.example.com');

      // **Assertion 2: Top-level Variable Inheritance**
      // Verifies that staging environment inherits base environment values when not overridden
      const v4StagingAuthTokenInput = page.locator('input[value="authToken"]');
      await expect(v4StagingAuthTokenInput).toBeVisible();
      const v4StagingAuthTokenRow = v4StagingAuthTokenInput.locator('xpath=ancestor::tr');
      // Assert: Staging inherits authToken from base (not overridden in staging)
      await expect(v4StagingAuthTokenRow.locator('.CodeMirror-line').first()).toHaveText('your_auth_token_here');

      // **Assertion 3: Nested Object Variable Override and Inheritance**
      // Verifies that nested object properties can be selectively overridden while inheriting others
      const v4StagingUserNameInput = page.locator('input[value="user.name"]');
      const v4StagingUserIdInput = page.locator('input[value="user.id"]');
      const v4StagingUserRoles0Input = page.locator('input[value="user.roles[0]"]');
      await expect(v4StagingUserNameInput).toBeVisible();
      await expect(v4StagingUserIdInput).toBeVisible();
      await expect(v4StagingUserRoles0Input).toBeVisible();

      const v4StagingUserNameRow = v4StagingUserNameInput.locator('xpath=ancestor::tr');
      const v4StagingUserIdRow = v4StagingUserIdInput.locator('xpath=ancestor::tr');
      const v4StagingUserRoles0Row = v4StagingUserRoles0Input.locator('xpath=ancestor::tr');
      // Assert: Staging overrides user.name with its own value
      await expect(v4StagingUserNameRow.locator('.CodeMirror-line').first()).toHaveText('staging_admin');
      // Assert: Staging inherits user.id from base (not overridden in staging)
      await expect(v4StagingUserIdRow.locator('.CodeMirror-line').first()).toHaveText('123');
      // Assert: Staging inherits user.roles[0] from base (not overridden in staging)
      await expect(v4StagingUserRoles0Row.locator('.CodeMirror-line').first()).toHaveText('admin');
    });

    await test.step('Test Development Environment - verify new variables', async () => {
      await page
        .locator('div')
        .filter({ hasText: /^Development$/ })
        .first()
        .click();

      // **Assertion 1: Multiple Top-level Variable Overrides**
      // Verifies that development environment can override multiple base environment values
      const v4DevBaseUrlInput = page.locator('input[value="baseUrl"]');
      const v4DevAuthTokenInput = page.locator('input[value="authToken"]');
      await expect(v4DevBaseUrlInput).toBeVisible();
      await expect(v4DevAuthTokenInput).toBeVisible();

      const v4DevBaseUrlRow = v4DevBaseUrlInput.locator('xpath=ancestor::tr');
      const v4DevAuthTokenRow = v4DevAuthTokenInput.locator('xpath=ancestor::tr');
      // Assert: Development overrides baseUrl with its own value
      await expect(v4DevBaseUrlRow.locator('.CodeMirror-line').first()).toHaveText('https://dev-api.example.com');
      // Assert: Development overrides authToken with its own value
      await expect(v4DevAuthTokenRow.locator('.CodeMirror-line').first()).toHaveText('dev_token_123');

      // **Assertion 2: New Nested Variables Addition**
      // Verifies that development environment can add completely new nested variables not present in base
      const v4NewFeatureEnabledInput = page.locator('input[value="newFeature.enabled"]');
      const v4NewFeatureVersionInput = page.locator('input[value="newFeature.version"]');
      await expect(v4NewFeatureEnabledInput).toBeVisible();
      await expect(v4NewFeatureVersionInput).toBeVisible();

      const v4NewFeatureEnabledRow = v4NewFeatureEnabledInput.locator('xpath=ancestor::tr');
      const v4NewFeatureVersionRow = v4NewFeatureVersionInput.locator('xpath=ancestor::tr');
      // Assert: New boolean variable is added and converted to string
      await expect(v4NewFeatureEnabledRow.locator('.CodeMirror-line').first()).toHaveText('true');
      // Assert: New numeric variable is added and converted to string with full precision
      await expect(v4NewFeatureVersionRow.locator('.CodeMirror-line').first()).toHaveText('2.099123123');
    });

    await test.step('Close environment modal', async () => {
      // Close the environment configuration modal to ensure clean state
      await page.getByText('×').click();
    });
  });
});
