import { test, expect } from '../../../playwright';
import { closeOpenCollectionModal, showOpenCollectionModal } from '../../../pages/open-collection-modal/shell';
import { buildImportPageLocators } from '../../../pages/open-collection-modal/import-page';

test.describe('File Input Acceptance', () => {
  test.afterEach(async ({ page }) => {
    await closeOpenCollectionModal(page);
  });

  test('File input accepts expected file types', async ({ page }) => {
    const fileInput = buildImportPageLocators(page).fileInput();

    await test.step('Open the Import page', async () => {
      await showOpenCollectionModal(page, 'import');
    });

    await test.step('Verify the file input accepts the expected file types, several at once', async () => {
      // Check that file input exists (even if hidden)
      await expect(fileInput).toBeAttached();

      const acceptValue = await fileInput.getAttribute('accept');
      expect(acceptValue).toContain('.json');
      expect(acceptValue).toContain('.yaml');
      expect(acceptValue).toContain('.yml');
      expect(acceptValue).toContain('.wsdl');
      expect(acceptValue).toContain('.zip');
      await expect(fileInput).toHaveAttribute('multiple');
    });
  });
});
