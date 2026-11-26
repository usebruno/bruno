import { test, expect } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators } from '../../../pages';
import { buildOpenCollectionModalLocators, closeOpenCollectionModal } from '../../../pages/open-collection-modal/shell';
import { selectImportFiles } from '../../../pages/open-collection-modal/import-page';

test.describe('Invalid Insomnia Collection - Missing Collection Array', () => {
  test.afterEach(async ({ page }) => {
    await closeOpenCollectionModal(page);
  });

  test('Handle Insomnia v5 collection missing collection array', async ({ page }) => {
    const insomniaFile = path.resolve(__dirname, 'fixtures', 'insomnia-v5-invalid-missing-collection.yaml');
    const { toast, import: importLocators } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const unsupportedFormat = toast.byMessage('Unsupported collection format');

    await test.step('Select the Insomnia v5 file without a collection array on the Import page', async () => {
      await expect(unsupportedFormat).toHaveCount(0);
      await selectImportFiles(page, [insomniaFile]);
    });

    await test.step('Verify it is rejected as an unsupported format', async () => {
      await expect(unsupportedFormat).toBeVisible();
      await expect(openCollectionModal.pageView('import')).toBeVisible();
      await expect(importLocators.locationModal()).toBeHidden();
    });
  });
});
