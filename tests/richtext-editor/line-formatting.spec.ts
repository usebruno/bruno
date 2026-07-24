import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';
import { setupRequestDocs } from './utils';

test.describe('Rich Text Editor Edge Cases - Line Formatting', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Line-Level Formatting', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-line-formatting');

    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();
    await page.keyboard.type('Line 1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Line 2');

    await page.keyboard.press('ArrowUp');

    await locators.docs.headingDropdown().click();
    await locators.dropdown.item('Heading 1').click();

    await expect(prosemirror.locator('h1')).toHaveCount(1);
    await expect(prosemirror.locator('h1')).toContainText('Line 1');
    await expect(prosemirror.locator('p')).toContainText('Line 2');
  });

  test('Toolbar Tooltips visibility', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-tooltips');

    const boldButton = locators.docs.toolbarBtn('Bold');
    await expect(boldButton).toBeVisible();

    await boldButton.hover();

    await expect(locators.docs.tooltip('Bold')).toBeVisible();
  });

  test('Text Formatting and Undo/Redo', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-formatting');

    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();
    await page.keyboard.type('Hello World');

    await page.keyboard.down('Shift');
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowLeft');
    }
    await page.keyboard.up('Shift');

    await locators.docs.toolbarBtn('Bold').click();
    await expect(prosemirror.locator('strong')).toHaveText('World');

    await locators.docs.toolbarBtn('Italic').click();
    await expect(prosemirror.locator('strong em, em strong').first()).toHaveText('World');

    await locators.docs.toolbarBtn('Undo').click();
    await expect(prosemirror.locator('em')).toHaveCount(0);
    await expect(prosemirror.locator('strong')).toHaveText('World');

    await locators.docs.toolbarBtn('Redo').click();
    await expect(prosemirror.locator('strong em, em strong').first()).toHaveText('World');

    await locators.docs.toolbarBtn('Strikethrough').click();
    await expect(prosemirror.locator('s')).toHaveText('World');

    await locators.docs.toolbarBtn('Inline code').click();
    await expect(prosemirror.locator('code')).toHaveText('World');
  });
});
