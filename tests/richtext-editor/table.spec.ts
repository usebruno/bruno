import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';
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
