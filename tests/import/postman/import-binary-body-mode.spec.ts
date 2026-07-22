import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, openCollection, selectRequestPaneTab } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Import Postman Collection with binary body mode', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should import Postman collection with binary body mode successfully', async ({ page, electronApp, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-import-binary-body-mode.json');
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
      await locators.import.fileInput().setInputFiles(postmanFile);
      await locators.import.locationModal().waitFor({ state: 'visible', timeout: 5000 });
      const locationModal = locators.import.locationModal();
      await expect(locationModal.getByText('Binary body type')).toBeVisible();
      await locators.import.browseLink(locationModal).click();
      await locators.import.importButton(locationModal).click();
      await locationModal.waitFor({ state: 'hidden' });
      await openCollection(page, 'Binary body type');
      await expect(locators.sidebar.collection('Binary body type')).toBeVisible();
    });

    await test.step('Verify body mode is File / Binary and imported file path is preserved', async () => {
      await locators.sidebar.request('Binary body mode').click();
      await expect(locators.request.pane()).toBeVisible();
      await selectRequestPaneTab(page, 'Body');
      await expect(locators.request.bodyModeLabel()).toContainText('File / Binary');
      await expect(locators.request.pane().getByText('binary-payload.bin')).toBeVisible();
    });

    await test.step('Verify example is imported and preserves the binary body mode', async () => {
      const examplesToggle = locators.sidebar.requestExamplesToggle('Binary body mode');
      await expect(examplesToggle).toBeVisible();
      await examplesToggle.click();
      const example = locators.sidebar.request('Binary upload example');
      await expect(example).toBeVisible();
      await example.click();
      const examplePane = locators.request.pane();
      await expect(examplePane).toBeVisible();
      await expect(locators.request.exampleBodyModeLabel()).toContainText('File / Binary');
      await expect(examplePane.getByText('binary-payload.bin')).toBeVisible();
    });
  });
});
