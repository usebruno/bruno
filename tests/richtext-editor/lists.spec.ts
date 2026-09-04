import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';
import { setupRequestDocs, clickDocsToolbarBtn } from './actions';

test.describe('Rich Text Docs Editor Edge Cases - Lists', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Lists Formatting', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-lists');

    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();
    await page.keyboard.type('Item 1');

    await clickDocsToolbarBtn(locators, 'Bullet list');
    await expect(prosemirror.locator('ul > li')).toContainText('Item 1');

    await page.keyboard.press('Enter');
    await page.keyboard.type('Item 2');

    await clickDocsToolbarBtn(locators, 'Numbered list');
    await expect(prosemirror.locator('ol > li').nth(1)).toContainText('Item 2');

    await clickDocsToolbarBtn(locators, 'Numbered list');
    await expect(prosemirror.locator('p').filter({ hasText: 'Item 2' })).toBeVisible();

    await clickDocsToolbarBtn(locators, 'Task list');
    await expect(prosemirror.locator('ul[data-type="taskList"] > li')).toBeVisible();

    const checkbox = prosemirror.locator('ul[data-type="taskList"] > li label input[type="checkbox"]').first();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  });
});
