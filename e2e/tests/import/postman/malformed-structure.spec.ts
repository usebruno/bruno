import { test, expect } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators } from '../../../pages';
import { buildOpenCollectionModalLocators, closeOpenCollectionModal } from '../../../pages/open-collection-modal/shell';
import { selectImportFiles } from '../../../pages/open-collection-modal/import-page';

test.describe('Invalid Postman Collection - Malformed Structure', () => {
  test.afterEach(async ({ page }) => {
    await closeOpenCollectionModal(page);
  });

  test('Handle malformed Postman collection structure', async ({ page }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-malformed.json');
    const { toast, import: importLocators } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const unsupportedFormat = toast.byMessage('Unsupported collection format');

    await test.step('Select the malformed Postman file on the Import page', async () => {
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
