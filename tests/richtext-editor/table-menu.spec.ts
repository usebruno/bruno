import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';
import { setupRequestDocs, clickDocsToolbarBtn } from './actions';

test.describe('Rich Text Editor Edge Cases - Table Menu', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Table options menu adds/removes rows and columns, and deletes the table', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-table-menu');
    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();
    await clickDocsToolbarBtn(locators, 'Table');
    await expect(prosemirror.locator('table')).toBeVisible();
    await expect(prosemirror.locator('tr')).toHaveCount(3);
    await expect(prosemirror.locator('tr').first().locator('th, td')).toHaveCount(3);

    // A trailing empty paragraph is appended after the table when it's the
    // last node in the doc, which can leave the cursor outside the table
    // right after insertion — click into a cell so the table options menu
    // (only rendered while the cursor is inside a table) becomes available.
    await prosemirror.locator('table td, table th').first().click();

    const tableMenuTrigger = locators.docs.tableMenuTrigger();
    await expect(tableMenuTrigger).toBeVisible();

    await test.step('Add row below and above', async () => {
      await tableMenuTrigger.click();
      await locators.dropdown.item('Add row below').click();
      await expect(prosemirror.locator('tr')).toHaveCount(4);

      await tableMenuTrigger.click();
      await locators.dropdown.item('Add row above').click();
      await expect(prosemirror.locator('tr')).toHaveCount(5);
    });

    await test.step('Delete row', async () => {
      await tableMenuTrigger.click();
      await locators.dropdown.item('Delete row').click();
      await expect(prosemirror.locator('tr')).toHaveCount(4);
    });

    await test.step('Add column left and right', async () => {
      await tableMenuTrigger.click();
      await locators.dropdown.item('Add column left').click();
      await expect(prosemirror.locator('tr').first().locator('th, td')).toHaveCount(4);

      await tableMenuTrigger.click();
      await locators.dropdown.item('Add column right').click();
      await expect(prosemirror.locator('tr').first().locator('th, td')).toHaveCount(5);
    });

    await test.step('Delete column', async () => {
      await tableMenuTrigger.click();
      await locators.dropdown.item('Delete column').click();
      await expect(prosemirror.locator('tr').first().locator('th, td')).toHaveCount(4);
    });

    await test.step('Delete table', async () => {
      await tableMenuTrigger.click();
      await locators.dropdown.item('Delete table').click();
      await expect(prosemirror.locator('table')).toHaveCount(0);
    });
  });
});
