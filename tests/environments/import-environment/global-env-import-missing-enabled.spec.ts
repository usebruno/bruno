import { test, expect } from '../../../playwright';
import path from 'path';
import { importCollection, deleteAllGlobalEnvironments, closeAllCollections } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Global Environment Import - missing enabled field', () => {
  test.afterEach(async ({ page }) => {
    await deleteAllGlobalEnvironments(page);
    await closeAllCollections(page);
  });

  test('imports a postman global environment when a variable omits the enabled field', async ({
    page,
    createTmpDir
  }) => {
    const collectionFile = path.join(__dirname, 'fixtures', 'collection.json');
    const globalEnvFile = path.join(__dirname, 'fixtures', 'global-env-missing-enabled.json');
    const locators = buildCommonLocators(page);

    await test.step('Import collection', async () => {
      await importCollection(page, collectionFile, await createTmpDir('global-env-missing-enabled'), {
        expectedCollectionName: 'Environment Test Collection'
      });
    });

    await test.step('Import postman global environment with a variable missing enabled', async () => {
      await locators.environment.selector().click();
      await locators.environment.globalTab().click();
      await page.getByText('Import', { exact: true }).click();

      const importModal = page.locator('[data-testid="import-global-environment-modal"]');
      await expect(importModal).toBeVisible();

      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('[data-testid="import-global-environment"]').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(globalEnvFile);
    });

    await test.step('Environment is created and variables are present', async () => {
      await expect(locators.environment.currentEnvironment()).toContainText('Missing Enabled Global Environment');

      const envTab = locators.environment.globalEnvTab();
      await expect(envTab).toBeVisible();

      const variablesTable = page.locator('.table-container');
      await expect(variablesTable.locator('input[name$=".name"][value="api_url"]')).toBeVisible();
      await expect(variablesTable.locator('input[name$=".name"][value="backend_url"]')).toBeVisible();
      await expect(variablesTable.locator('input[name$=".name"][value="disabled_var"]')).toBeVisible();
    });

    await test.step('The variable that omitted enabled is imported enabled; explicit false stays disabled', async () => {
      await expect(locators.environment.varRow('backend_url').locator('input[name$=".enabled"]')).toBeChecked();
      await expect(locators.environment.varRow('disabled_var').locator('input[name$=".enabled"]')).not.toBeChecked();
    });
  });
});
