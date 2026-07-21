import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';
import { setupRequestDocs } from './utils';

test.describe('Rich Text Docs Editor Edge Cases - Lists', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Lists Formatting', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-lists');

    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();
    await page.keyboard.type('Item 1');

    await locators.docs.toolbarBtn('Bullet list').click();
    await expect(prosemirror.locator('ul > li')).toContainText('Item 1');

    await page.keyboard.press('Enter');
    await page.keyboard.type('Item 2');

    await locators.docs.toolbarBtn('Numbered list').click();
    await expect(prosemirror.locator('ol > li').nth(1)).toContainText('Item 2');

    await locators.docs.toolbarBtn('Numbered list').click();
    await expect(prosemirror.locator('p').filter({ hasText: 'Item 2' })).toBeVisible();

    await locators.docs.toolbarBtn('Task list').click();
    await expect(prosemirror.locator('ul[data-type="taskList"] > li')).toBeVisible();

    const checkbox = prosemirror.locator('ul[data-type="taskList"] > li label input[type="checkbox"]').first();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  });
});
