import { test, expect } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators } from '../../../pages';
import { buildOpenCollectionModalLocators, closeOpenCollectionModal } from '../../../pages/open-collection-modal/shell';
import { selectImportFiles } from '../../../pages/open-collection-modal/import-page';

test.describe('Invalid File Handling', () => {
  test.afterEach(async ({ page }) => {
    await closeOpenCollectionModal(page);
  });

  test('Handle invalid file without crashing', async ({ page }) => {
    const { toast, import: importLocators } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const parseErrorToast = toast.byMessage('Failed to parse the file – ensure it is valid JSON or YAML');
    const invalidFile = path.resolve(__dirname, 'fixtures', 'invalid.txt');

    await test.step('Select the invalid file on the Import page', async () => {
      await expect(parseErrorToast).toHaveCount(0);
      await selectImportFiles(page, [invalidFile]);
    });

    await test.step('Verify the parse error toast and that the Import page stays open', async () => {
      await expect(parseErrorToast).toBeVisible();
      await expect(openCollectionModal.pageView('import')).toBeVisible();
      await expect(importLocators.locationModal()).toBeHidden();
    });
  });
});
