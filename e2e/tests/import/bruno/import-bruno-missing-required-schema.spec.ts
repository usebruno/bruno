import { test, expect } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators } from '../../../pages';
import { buildOpenCollectionModalLocators, closeOpenCollectionModal } from '../../../pages/open-collection-modal/shell';
import { selectImportFiles } from '../../../pages/open-collection-modal/import-page';

test.describe('Import Bruno Collection - Missing Required Schema Fields', () => {
  test.afterEach(async ({ page }) => {
    await closeOpenCollectionModal(page);
  });

  test('Import Bruno collection missing required version field should fail', async ({ page }) => {
    const brunoFile = path.resolve(__dirname, 'fixtures', 'bruno-missing-required-fields.json');
    const { toast, import: importLocators } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const unsupportedFormat = toast.byMessage('Unsupported collection format');

    await test.step('Select the collection that has no version field on the Import page', async () => {
      await expect(unsupportedFormat).toHaveCount(0);
      await selectImportFiles(page, [brunoFile]);
    });

    await test.step('Verify it is rejected as an unsupported format', async () => {
      await expect(unsupportedFormat).toBeVisible();
      await expect(openCollectionModal.pageView('import')).toBeVisible();
      await expect(importLocators.locationModal()).toBeHidden();
    });
  });
});
