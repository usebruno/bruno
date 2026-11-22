import { test, expect } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators } from '../../../pages';
import { buildOpenCollectionModalLocators, closeOpenCollectionModal } from '../../../pages/open-collection-modal/shell';
import { selectImportFiles } from '../../../pages/open-collection-modal/import-page';

test.describe('Import Corrupted Bruno Collection - Should Fail', () => {
  test.afterEach(async ({ page }) => {
    await closeOpenCollectionModal(page);
  });

  test('Import Bruno collection with invalid JSON structure should fail', async ({ page }) => {
    const brunoFile = path.resolve(__dirname, 'fixtures', 'bruno-malformed.json');
    const { toast, import: importLocators } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const parseError = toast.byMessage('Failed to parse the file');

    await test.step('Select the corrupted file on the Import page', async () => {
      await expect(parseError).toHaveCount(0);
      await selectImportFiles(page, [brunoFile]);
    });

    await test.step('Verify the file is rejected and the Import page stays open', async () => {
      await expect(parseError).toBeVisible();
      await expect(openCollectionModal.pageView('import')).toBeVisible();
      await expect(importLocators.locationModal()).toBeHidden();
    });
  });
});
