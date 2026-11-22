import path from 'path';
import { test, expect } from '../../../playwright';
import {
  closeAllCollections,
  importCollection,
  selectRequestPaneTab,
  buildCommonLocators
} from '../../../pages';

test.describe('Import Postman Collection with binary body mode', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should import a Postman binary body and preserve the file path', async ({ page, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-import-binary-body-mode.json');
    const locators = buildCommonLocators(page);
    const importDir = await createTmpDir('imported-collection');

    await test.step('Import the Postman collection', async () => {
      await importCollection(page, postmanFile, importDir, { expectedCollectionName: 'Binary body type' });
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
