import path from 'path';
import { test, expect } from '../../../playwright';
import {
  closeAllCollections,
  mockBrowseFiles,
  openCollection,
  selectRequestPaneTab
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Import Postman Collection with binary body mode', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should import a Postman binary body and preserve the file path', async ({ page, electronApp, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-import-binary-body-mode.json');
    const locators = buildCommonLocators(page);
    const importDir = await createTmpDir('imported-collection');

    await mockBrowseFiles(electronApp, [importDir]);

    await test.step('Import Postman collection via file picker', async () => {
      await locators.plusMenu.button().click();
      await locators.plusMenu.importCollection().click();
      await locators.import.modal().waitFor({ state: 'visible' });
      await locators.import.fileInput().setInputFiles(postmanFile);

      const locationModal = locators.import.locationModal();
      await locationModal.waitFor({ state: 'visible', timeout: 5000 });
      await expect(locationModal.getByText('Binary body type')).toBeVisible();
      await locators.import.browseLink(locationModal).click();
      await locators.import.importButton(locationModal).click();
      await locationModal.waitFor({ state: 'hidden' });

      await openCollection(page, 'Binary body type');
      await expect(locators.sidebar.collection('Binary body type')).toBeVisible();
    });

    await test.step('Assert request body imports as File / Binary', async () => {
      await locators.sidebar.request('Binary body mode').click();
      await selectRequestPaneTab(page, 'Body');
      await expect(locators.request.bodyModeLabel()).toContainText('File / Binary');
      await expect(locators.request.pane().getByText('binary-payload.bin')).toBeVisible();
    });

    await test.step('Assert example body imports as File / Binary', async () => {
      await locators.sidebar.requestExamplesToggle('Binary body mode').click();
      await locators.sidebar.request('Binary upload example').click();
      const examplePane = locators.request.pane();
      await expect(locators.request.exampleBodyModeLabel()).toContainText('File / Binary');
      await expect(examplePane.getByText('binary-payload.bin')).toBeVisible();
    });
  });
});
