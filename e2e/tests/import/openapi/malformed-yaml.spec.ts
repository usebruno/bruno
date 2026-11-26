import { test, expect } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators } from '../../../pages';
import { buildOpenCollectionModalLocators, closeOpenCollectionModal } from '../../../pages/open-collection-modal/shell';
import { selectImportFiles } from '../../../pages/open-collection-modal/import-page';

test.describe('Invalid OpenAPI - Malformed YAML', () => {
  test.afterEach(async ({ page }) => {
    await closeOpenCollectionModal(page);
  });

  test('Handle malformed OpenAPI YAML structure', async ({ page }) => {
    const { toast, import: importLocators } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const parseErrorToast = toast.byMessage('Failed to parse the file – ensure it is valid JSON or YAML');
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-malformed.yaml');

    await test.step('Select the malformed OpenAPI file on the Import page', async () => {
      await expect(parseErrorToast).toHaveCount(0);
      await selectImportFiles(page, [openApiFile]);
    });

    await test.step('Verify the parse error toast and that the Import page stays open', async () => {
      await expect(parseErrorToast).toBeVisible();
      await expect(openCollectionModal.pageView('import')).toBeVisible();
      await expect(importLocators.locationModal()).toBeHidden();
    });
  });
});
