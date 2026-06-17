import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Import Collection File Format Options toggle', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('hides File Format by default and reveals it via the Options toggle', async ({ page }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-import-apikey-header-collection.json');
    const locators = buildCommonLocators(page);

    await test.step('Open import collection modal', async () => {
      await locators.plusMenu.button().click();
      await locators.plusMenu.importCollection().click();
      await expect(locators.modal.title('Import Collection')).toBeVisible();
    });

    await test.step('Upload Postman collection and reach the location modal', async () => {
      await locators.import.fileInput().setInputFiles(postmanFile);
      await locators.import.locationModal().waitFor({ state: 'visible', timeout: 10000 });
    });

    const locationModal = locators.import.locationModal();

    await test.step('File Format selector is hidden by default', async () => {
      await expect(locationModal.locator('#format')).toHaveCount(0);
    });

    await test.step('Options toggle reveals the File Format selector defaulting to OpenCollection (YAML)', async () => {
      await locationModal.getByRole('button', { name: 'Options' }).click();
      await page.getByTestId('show-file-format-toggle').click();

      const formatSelect = locationModal.locator('#format');
      await expect(formatSelect).toBeVisible();
    });

    await test.step('OpenCollection (YAML) is pre-selected and BRU is available', async () => {
      const formatSelect = locationModal.locator('#format');
      await expect(formatSelect.locator('option')).toHaveText(['OpenCollection (YAML)', 'BRU Format (.bru)']);
      await expect(formatSelect).toHaveValue('yml');
    });

    await test.step('Toggle can switch the format and hide the selector again', async () => {
      const formatSelect = locationModal.locator('#format');
      await formatSelect.selectOption('bru');
      await expect(formatSelect).toHaveValue('bru');

      await locationModal.getByRole('button', { name: 'Options' }).click();
      const toggle = page.getByTestId('show-file-format-toggle');
      await expect(toggle).toHaveText('Hide File Format');
      await toggle.click();

      await expect(locationModal.locator('#format')).toHaveCount(0);
    });
  });
});
