import * as path from 'path';
import { test, expect } from '../../../playwright';
import { closeAllCollections, openCollection, selectRequestPaneTab } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const MISSING_FILE_WARNING = 'The file above is not in the given directory, please upload it again.';

test.describe('File / Binary body missing-file warning', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should show warning for missing binary file', async ({ page, electronApp, createTmpDir }) => {
    const collectionFile = path.resolve(__dirname, 'fixtures', 'binary-file-missing-warning.yml');
    const locators = buildCommonLocators(page);

    const importDir = await createTmpDir('imported-collection');

    await electronApp.evaluate(({ dialog }, { importDir }) => {
      const originalShowOpenDialog = dialog.showOpenDialog;
      dialog.showOpenDialog = async () => {
        dialog.showOpenDialog = originalShowOpenDialog;
        return {
          canceled: false,
          filePaths: [importDir]
        };
      };
    }, { importDir });

    await test.step('Import collection', async () => {
      await locators.plusMenu.button().click();
      await locators.plusMenu.importCollection().click();
      const importModal = locators.import.modal();
      await importModal.waitFor({ state: 'visible' });
      await locators.import.fileInput().setInputFiles(collectionFile);
      await locators.import.locationModal().waitFor({ state: 'visible', timeout: 5000 });
      const locationModal = locators.import.locationModal();
      await expect(locationModal.getByText('Binary body type')).toBeVisible();
      await locators.import.browseLink(locationModal).click();
      await locators.import.importButton(locationModal).click();
      await locationModal.waitFor({ state: 'hidden' });
      await openCollection(page, 'Binary body type');
      await expect(locators.sidebar.collection('Binary body type')).toBeVisible();
    });

    await test.step('shows a warning when the binary file does not exist on disk', async () => {
      await locators.sidebar.request('Binary body - missing file').click();
      await expect(locators.request.pane()).toBeVisible();
      await selectRequestPaneTab(page, 'Body');

      const filePicker = page.locator('.file-picker-selected').first();
      await expect(filePicker).toBeVisible({ timeout: 5000 });
      await expect(filePicker.locator('.file-name')).toHaveText('missing-payload.bin');

      // Warning: the missing-file styling, icon and tooltip must be present.
      await expect(filePicker).toHaveClass(/has-warning/);
      const warningIcon = filePicker.locator('.warning-icon');
      await expect(warningIcon).toBeVisible();

      await warningIcon.hover();
      const tooltip = page.locator('.tooltip-mod');
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText(MISSING_FILE_WARNING);
    });
  });
});
