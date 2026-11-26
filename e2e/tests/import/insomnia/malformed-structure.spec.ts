import { test, expect } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators } from '../../../pages';
import { buildOpenCollectionModalLocators, closeOpenCollectionModal } from '../../../pages/open-collection-modal/shell';
import { selectImportFiles } from '../../../pages/open-collection-modal/import-page';

test.describe('Invalid Insomnia Collection - Malformed Structure', () => {
  test.afterEach(async ({ page }) => {
    await closeOpenCollectionModal(page);
  });

  test('Handle malformed Insomnia collection structure', async ({ page }) => {
    const insomniaFile = path.resolve(__dirname, 'fixtures', 'insomnia-malformed.json');
    const { toast, import: importLocators } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const parseError = toast.byMessage('Failed to parse the file');

    await test.step('Select the malformed Insomnia file on the Import page', async () => {
      await expect(parseError).toHaveCount(0);
      await selectImportFiles(page, [insomniaFile]);
    });

    await test.step('Verify it is rejected as unparseable', async () => {
      await expect(parseError).toBeVisible();
      await expect(openCollectionModal.pageView('import')).toBeVisible();
      await expect(importLocators.locationModal()).toBeHidden();
    });
  });
});
