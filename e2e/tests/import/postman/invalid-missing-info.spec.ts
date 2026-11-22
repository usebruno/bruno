import { test, expect } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators } from '../../../pages';
import { buildOpenCollectionModalLocators, closeOpenCollectionModal } from '../../../pages/open-collection-modal/shell';
import { selectImportFiles } from '../../../pages/open-collection-modal/import-page';

test.describe('Invalid Postman Collection - Missing Info', () => {
  test.afterEach(async ({ page }) => {
    await closeOpenCollectionModal(page);
  });

  test('Handle Postman collection missing required info field', async ({ page }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-invalid-missing-info.json');
    const { toast, import: importLocators } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const unsupportedFormat = toast.byMessage('Unsupported collection format');

    await test.step('Select the Postman file without info on the Import page', async () => {
      await expect(unsupportedFormat).toHaveCount(0);
      await selectImportFiles(page, [postmanFile]);
    });

    await test.step('Verify it is rejected as an unsupported format', async () => {
      await expect(unsupportedFormat).toBeVisible();
      await expect(openCollectionModal.pageView('import')).toBeVisible();
      await expect(importLocators.locationModal()).toBeHidden();
    });
  });
});
