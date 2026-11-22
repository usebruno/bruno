import { test, expect } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators } from '../../../pages';
import { buildOpenCollectionModalLocators, closeOpenCollectionModal } from '../../../pages/open-collection-modal/shell';
import { selectImportFiles } from '../../../pages/open-collection-modal/import-page';

test.describe('Invalid OpenAPI - Missing Info Section', () => {
  test.afterEach(async ({ page }) => {
    await closeOpenCollectionModal(page);
  });

  test('Handle OpenAPI specification missing required info section', async ({ page }) => {
    const { toast, import: importLocators } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const unsupportedFormatToast = toast.byMessage('Unsupported collection format');
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-missing-info.yaml');

    await test.step('Select the OpenAPI file without an info section on the Import page', async () => {
      await expect(unsupportedFormatToast).toHaveCount(0);
      await selectImportFiles(page, [openApiFile]);
    });

    await test.step('Verify the unsupported format toast and that the Import page stays open', async () => {
      await expect(unsupportedFormatToast).toBeVisible();
      await expect(openCollectionModal.pageView('import')).toBeVisible();
      await expect(importLocators.locationModal()).toBeHidden();
    });
  });
});
