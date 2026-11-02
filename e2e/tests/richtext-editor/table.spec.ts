import { test, expect } from '@e2e/test';
import { closeAllCollections } from '@e2e/pages';
import { setupRequestDocs, clickDocsToolbarBtn } from './actions';

test.describe('Rich Text Editor Edge Cases - Tables', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Table Insertion', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-table');

    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();

    await clickDocsToolbarBtn(locators, 'Table');

    await expect(prosemirror.locator('table')).toBeVisible();
    await expect(prosemirror.locator('tr')).toHaveCount(3);
  });
});
