import { test, expect } from '../../../playwright';
import * as path from 'path';
import * as fs from 'fs/promises';
import { buildCommonLocators, closeAllCollections, openBulkImportModal } from '../../../pages';

const getCollectionName = (index: number) => `Select All Collection ${String(index).padStart(2, '0')}`;

test.describe('Bulk Import - Select all', () => {
  const testDataDir = path.join(__dirname, '../test-data');

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Select all toggles every collection on, then off, and reflects indeterminate state', async ({
    page,
    createTmpDir
  }) => {
    const { import: importLocators, modal } = buildCommonLocators(page);
    const sourceFile = path.join(testDataDir, 'sample-postman.json');
    const tempDir = await createTmpDir('bulk-import-select-all');
    const sourceContent = JSON.parse(await fs.readFile(sourceFile, 'utf-8'));

    const importFiles: string[] = [];
    const totalCollections = 6;
    for (let index = 1; index <= totalCollections; index++) {
      const filePath = path.join(tempDir, `sample-postman-${index}.json`);
      const fileContent = {
        ...sourceContent,
        info: {
          ...sourceContent.info,
          name: getCollectionName(index)
        }
      };

      await fs.writeFile(filePath, JSON.stringify(fileContent, null, 2), 'utf-8');
      importFiles.push(filePath);
    }

    const itemCheckboxes = importLocators.bulkCollectionCheckboxes();
    const selectAllToggle = importLocators.bulkSelectAllCollectionsToggle();
    const selectAllCheckbox = importLocators.bulkSelectAllCollectionsCheckbox();

    await test.step('Select the files and verify the Bulk Import modal lists every collection', async () => {
      await openBulkImportModal(page, importFiles);

      await expect(modal.title('Bulk Import')).toBeVisible();
      await expect(importLocators.bulkCollectionsCount()).toHaveText(String(totalCollections));
      await expect(itemCheckboxes).toHaveCount(totalCollections);
    });

    await test.step('Bulk import opens with every collection pre-selected', async () => {
      await expect(selectAllCheckbox).toBeChecked();
      for (let i = 0; i < totalCollections; i++) {
        await expect(itemCheckboxes.nth(i)).toBeChecked();
      }
    });

    await test.step('Clicking Select all unchecks every collection', async () => {
      await selectAllToggle.click();
      await expect(selectAllCheckbox).not.toBeChecked();
      for (let i = 0; i < totalCollections; i++) {
        await expect(itemCheckboxes.nth(i)).not.toBeChecked();
      }
    });

    await test.step('Clicking Select all again rechecks every collection', async () => {
      await selectAllToggle.click();
      await expect(selectAllCheckbox).toBeChecked();
      for (let i = 0; i < totalCollections; i++) {
        await expect(itemCheckboxes.nth(i)).toBeChecked();
      }
    });

    await test.step('Unchecking a single collection puts Select all into the indeterminate state', async () => {
      await itemCheckboxes.first().click();
      const checkedCount = await itemCheckboxes.evaluateAll(
        (nodes) => nodes.filter((node) => (node as HTMLInputElement).checked).length
      );
      expect(checkedCount).toBe(totalCollections - 1);
      const isIndeterminate = await selectAllCheckbox.evaluate(
        (node) => (node as HTMLInputElement).indeterminate
      );
      expect(isIndeterminate).toBe(true);
    });

    await test.step('Clicking Select all from indeterminate selects every collection', async () => {
      await selectAllToggle.click();
      await expect(selectAllCheckbox).toBeChecked();
      const isIndeterminate = await selectAllCheckbox.evaluate(
        (node) => (node as HTMLInputElement).indeterminate
      );
      expect(isIndeterminate).toBe(false);
      for (let i = 0; i < totalCollections; i++) {
        await expect(itemCheckboxes.nth(i)).toBeChecked();
      }
    });

    await test.step('Search narrows Select all to the filtered subset only', async () => {
      await selectAllToggle.click();
      await expect(selectAllCheckbox).not.toBeChecked();

      const searchInput = importLocators.bulkCollectionsSearchInput();
      await searchInput.fill('01');

      const visibleCount = await itemCheckboxes.count();
      expect(visibleCount).toBeGreaterThan(0);
      expect(visibleCount).toBeLessThan(totalCollections);

      await selectAllToggle.click();
      await expect(selectAllCheckbox).toBeChecked();
      for (let i = 0; i < visibleCount; i++) {
        await expect(itemCheckboxes.nth(i)).toBeChecked();
      }

      await searchInput.fill('');
      await expect(itemCheckboxes).toHaveCount(totalCollections);
      const isIndeterminate = await selectAllCheckbox.evaluate(
        (node) => (node as HTMLInputElement).indeterminate
      );
      expect(isIndeterminate).toBe(true);
    });

    await test.step('Close the Bulk Import modal', async () => {
      await modal.closeButton().click();

      await expect(modal.backdrop()).toHaveCount(0);
    });
  });
});
