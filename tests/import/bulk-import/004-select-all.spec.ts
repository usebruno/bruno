import { test, expect } from '../../../playwright';
import * as path from 'path';
import * as fs from 'fs/promises';
import { closeAllCollections } from '../../utils/page';

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

    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', importFiles);
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    const bulkImportModal = page.getByRole('dialog');
    await expect(bulkImportModal.locator('.bruno-modal-header-title')).toContainText('Bulk Import');

    const collectionsHeading = bulkImportModal.getByTestId('selection-heading').filter({ hasText: 'Collections' });
    await expect(collectionsHeading.getByTestId('selection-count')).toHaveText(String(totalCollections));

    const collectionsSection = collectionsHeading.locator('..');
    const collectionList = collectionsSection.getByTestId('selection-list');
    const itemCheckboxes = collectionList.locator('.selection-item input[type="checkbox"]');
    const selectAllToggle = collectionsSection.getByTestId('selection-select-all-toggle');
    const selectAllCheckbox = selectAllToggle.locator('input[type="checkbox"]');

    await expect(itemCheckboxes).toHaveCount(totalCollections);

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
      await collectionList.locator('.selection-item').first().click();
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

      const searchInput = collectionsSection.getByTestId('selection-search-input');
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

    await page.getByTestId('modal-close-button').click();
    await expect(page.locator('.bruno-modal-backdrop')).toHaveCount(0);
  });
});
