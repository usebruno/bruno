import { test, expect } from '../../../playwright';
import type { Locator } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs/promises';
import { closeAllCollections } from '../../utils/page';

const getViewportCollectionName = (index: number) => `Viewport Collection ${String(index).padStart(2, '0')}`;

const getFullyVisibleRowNames = async (list: Locator) => {
  return list.evaluate((node) => {
    const listRect = node.getBoundingClientRect();
    const items = Array.from(node.querySelectorAll('.selection-item'));

    return items
      .filter((item) => {
        const rect = item.getBoundingClientRect();
        return rect.top >= listRect.top && rect.bottom <= listRect.bottom;
      })
      .map((item) => item.textContent?.trim())
      .filter(Boolean);
  });
};

test.describe('Bulk Import Selection List', () => {
  const testDataDir = path.join(__dirname, '../test-data');
  const expectedVisibleRows = 5;

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('shows the configured number of visible rows and reveals later rows when scrolled', async ({ page, createTmpDir }) => {
    const sourceFile = path.join(testDataDir, 'sample-postman.json');
    const tempDir = await createTmpDir('bulk-import-selection-list');
    const sourceContent = JSON.parse(await fs.readFile(sourceFile, 'utf-8'));

    const importFiles: string[] = [];
    for (let index = 1; index <= 10; index++) {
      const filePath = path.join(tempDir, `sample-postman-${index}.json`);
      const fileContent = {
        ...sourceContent,
        info: {
          ...sourceContent.info,
          name: getViewportCollectionName(index)
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
    await expect(bulkImportModal.getByText('Collections (10)')).toBeVisible();

    const collectionList = bulkImportModal.locator('.selection-list').first();
    await expect(collectionList).toBeVisible();

    const initialVisibleRows = await getFullyVisibleRowNames(collectionList);
    expect(initialVisibleRows).toHaveLength(expectedVisibleRows);
    expect(initialVisibleRows[0]).toBe(getViewportCollectionName(1));
    expect(initialVisibleRows[expectedVisibleRows - 1]).toBe(getViewportCollectionName(expectedVisibleRows));
    expect(initialVisibleRows).not.toContain(getViewportCollectionName(expectedVisibleRows + 1));

    await collectionList.evaluate((list) => {
      list.scrollTop = list.scrollHeight;
    });

    await expect(async () => {
      const scrolledVisibleRows = await getFullyVisibleRowNames(collectionList);
      expect(scrolledVisibleRows).toHaveLength(expectedVisibleRows);
      expect(scrolledVisibleRows).toContain(getViewportCollectionName(9));
      expect(scrolledVisibleRows).toContain(getViewportCollectionName(10));
    }).toPass({ timeout: 5000 });

    // No collections were imported, so afterEach's closeAllCollections is a
    // no-op. Close the Bulk Import modal explicitly — the page is shared
    // worker-wide via the worker-scoped electronApp fixture, so the modal
    // backdrop would otherwise intercept clicks in the next test.
    await page.getByTestId('modal-close-button').click();
    await expect(page.locator('.bruno-modal-backdrop')).toHaveCount(0);
  });
});
