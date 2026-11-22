import { test, expect } from '../../../playwright';
import type { Locator } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs/promises';
import { buildCommonLocators, closeAllCollections, openBulkImportModal } from '../../../pages';

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
      .map((item) => item.querySelector('.selection-item-title')?.textContent?.trim())
      .filter(Boolean);
  });
};

test.describe('Bulk Import Selection List', () => {
  const testDataDir = path.join(__dirname, '../test-data');

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('shows the configured number of visible rows and reveals later rows when scrolled', async ({ page, createTmpDir }) => {
    const { import: importLocators, modal } = buildCommonLocators(page);
    const collectionList = importLocators.bulkCollectionsList();
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

    await test.step('Select the ten files and verify the Bulk Import modal lists every collection', async () => {
      await openBulkImportModal(page, importFiles);

      await expect(modal.title('Bulk Import')).toBeVisible();
      await expect(importLocators.bulkCollectionsCount()).toHaveText('10');
      await expect(collectionList).toBeVisible();
    });

    await test.step('Only the first rows are fully visible', async () => {
      const initialVisibleRows = await getFullyVisibleRowNames(collectionList);
      expect(initialVisibleRows.length).toBeGreaterThan(0);
      expect(initialVisibleRows.length).toBeLessThan(10);
      expect(initialVisibleRows[0]).toBe(getViewportCollectionName(1));
      expect(initialVisibleRows).not.toContain(getViewportCollectionName(10));
    });

    await test.step('Scrolling to the bottom reveals the last rows', async () => {
      await collectionList.evaluate((list) => {
        list.scrollTop = list.scrollHeight;
      });

      await expect(async () => {
        const scrolledVisibleRows = await getFullyVisibleRowNames(collectionList);
        expect(scrolledVisibleRows.length).toBeGreaterThan(0);
        expect(scrolledVisibleRows).toContain(getViewportCollectionName(9));
        expect(scrolledVisibleRows).toContain(getViewportCollectionName(10));
      }).toPass({ timeout: 5000 });
    });

    await test.step('Close the Bulk Import modal', async () => {
      // No collections were imported, so afterEach's closeAllCollections is a
      // no-op. Close the Bulk Import modal explicitly — the page is shared
      // worker-wide via the worker-scoped electronApp fixture, so the modal
      // backdrop would otherwise intercept clicks in the next test.
      await modal.closeButton().click();

      await expect(modal.backdrop()).toHaveCount(0);
    });
  });
});
