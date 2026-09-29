import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';
import { setupRequestDocs, clickDocsToolbarBtn } from './actions';

test.describe('Rich Text Editor Edge Cases - Toolbar Overflow', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Narrow toolbar collapses actions into the overflow menu, and overflowed actions still work', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-overflow');
    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();
    await page.keyboard.type('Hello');
    await page.keyboard.press('Home');
    await page.keyboard.down('Shift');
    await page.keyboard.press('End');
    await page.keyboard.up('Shift');
    await clickDocsToolbarBtn(locators, 'Bold');
    await expect(prosemirror.locator('strong')).toHaveText('Hello');

    // Shrink the window so the toolbar can no longer fit every action button.
    await page.setViewportSize({ width: 700, height: 800 });

    const overflowMenuTrigger = locators.docs.overflowMenuTrigger();
    await expect(overflowMenuTrigger).toBeVisible();
    // Overflowed actions are omitted from the primary row entirely, not just hidden.
    await expect(locators.docs.toolbarBtn('Undo')).toHaveCount(0);

    await overflowMenuTrigger.click();
    const undoItem = locators.dropdown.item('Undo');
    await expect(undoItem).toBeVisible();
    await undoItem.click();

    await expect(prosemirror.locator('strong')).toHaveCount(0);
    await expect(prosemirror.locator('p').filter({ hasText: 'Hello' })).toBeVisible();
  });
});
