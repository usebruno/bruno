import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';
import { setupRequestDocs } from './utils';

test.describe('Rich Text Docs Editor Edge Cases - Code Blocks', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Code Block Insertion', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-code-insertion');

    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();

    await locators.docs.toolbarBtn('Code block').click();
    await page.keyboard.type('const x = 1;');
    await expect(prosemirror.locator('pre code')).toContainText('const x = 1;');
  });

  test('Code Block Language Selection', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-code-lang');

    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();
    await locators.docs.toolbarBtn('Code block').click();
    await page.keyboard.type('const x = 1;');
    await page.keyboard.press('Enter');
    await page.keyboard.type('const y = 2;');

    const langSelector = prosemirror.locator('.docs-code-block-lang-selector');
    await expect(langSelector).toBeVisible();
    await expect(langSelector).toContainText('auto');

    // Click language selector dropdown
    await langSelector.click();

    // Select javascript
    const jsOption = page.locator('.dropdown-item[data-language="javascript"]');
    await expect(jsOption).toBeVisible();
    await jsOption.click();

    // Verify language changed
    await expect(langSelector).toContainText('javascript');

    // Verify code block is properly syntax highlighted (should have hljs classes)
    const keywords = prosemirror.locator('pre code .hljs-keyword');
    await expect(keywords).toHaveCount(2);
    await expect(keywords.first()).toContainText('const');
  });
});
