import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';
import { setupRequestDocs } from './actions';

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

    const langSelector = prosemirror.locator('.editor-code-block-lang-selector');
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

  test('Code Block Auto-detect on paste', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-code-paste');
    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();
    await locators.docs.toolbarBtn('Code block').click();

    // Paste a javascript snippet
    const snippet = `async function fetchUsers() {
        try {
          const response = await fetch("https://jsonplaceholder.typicode.com/users");
          const users = await response.json();
          console.log(users);
        } catch (error) {
          console.error("Error:", error);
        }
      }

      fetchUsers();`;

    await page.evaluate(async (text) => {
      await navigator.clipboard.writeText(text);
    }, snippet);

    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+V`);

    // After paste, the code block becomes multi-line, so the language selector becomes visible
    const langSelector = prosemirror.locator('.editor-code-block-lang-selector');
    await expect(langSelector).toBeVisible();

    // Verify language changed to javascript automatically
    await expect(langSelector).toContainText('javascript', { timeout: 5000 });
  });
});
