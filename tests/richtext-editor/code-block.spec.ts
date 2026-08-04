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

    await test.step('Insert code block', async () => {
      const prosemirror = locators.docs.proseMirror();
      await expect(prosemirror).toBeVisible();

      await prosemirror.click();
      await locators.docs.toolbarBtn('Code block').click();
    });

    await test.step('Type code content', async () => {
      await page.keyboard.type('const x = 1;');
      await expect(locators.docs.codeBlockContent()).toContainText('const x = 1;');
      await expect(locators.docs.codeBlockLangSelector()).toBeHidden();
    });
  });

  test('Code Block Language Selection', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-code-lang');

    await test.step('Create code block with multiple lines', async () => {
      const prosemirror = locators.docs.proseMirror();
      await expect(prosemirror).toBeVisible();

      await prosemirror.click();
      await locators.docs.toolbarBtn('Code block').click();
      await page.keyboard.type('const x = 1;');
      await page.keyboard.press('Enter');
      await page.keyboard.type('const y = 2;');
    });

    await test.step('Verify language selector is visible', async () => {
      const langSelector = locators.docs.codeBlockLangSelector();
      await expect(langSelector).toBeVisible();
      await expect(langSelector).toContainText('auto');
    });

    await test.step('Select JavaScript language', async () => {
      const langSelector = locators.docs.codeBlockLangSelector();
      await langSelector.click();

      const jsOption = locators.docs.codeBlockLangOption('javascript');
      await expect(jsOption).toBeVisible();
      await jsOption.click();

      await expect(langSelector).toContainText('javascript');
    });

    await test.step('Verify syntax highlighting is applied', async () => {
      const keywords = locators.docs.codeBlockSyntaxHighlight('hljs-keyword');
      await expect(keywords).toHaveCount(2);
      await expect(keywords.first()).toContainText('const');
    });
  });

  test('Code Block Auto-detect on paste', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-code-paste');

    await test.step('Create empty code block', async () => {
      const prosemirror = locators.docs.proseMirror();
      await expect(prosemirror).toBeVisible();

      await prosemirror.click();
      await locators.docs.toolbarBtn('Code block').click();
    });

    await test.step('Paste JavaScript code', async () => {
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
    });

    await test.step('Verify language auto-detected as JavaScript', async () => {
      const langSelector = locators.docs.codeBlockLangSelector();
      // After paste, the code block becomes multi-line, so the language selector becomes visible
      await expect(langSelector).toBeVisible();
      await expect(langSelector).toContainText('javascript');
    });
  });
  test('Code Block Copy Button', async ({ page, createTmpDir, context }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-code-copy');

    // Grant clipboard permissions for reading
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await test.step('Create code block', async () => {
      const prosemirror = locators.docs.proseMirror();
      await expect(prosemirror).toBeVisible();

      await prosemirror.click();
      await locators.docs.toolbarBtn('Code block').click();
      await page.keyboard.type('const x = 1;');
    });

    await test.step('Copy code content', async () => {
      const copyBtn = locators.docs.codeBlockCopyBtn();
      await expect(copyBtn).toBeVisible();

      await copyBtn.click();
    });

    await test.step('Verify clipboard text', async () => {
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toBe('const x = 1;');
    });
  });

  test('Markdown Editor Syntax Highlighting', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-markdown-highlight');

    await test.step('Switch to markdown editor', async () => {
      await locators.docs.modeSwitchMarkdown().click();
      await expect(locators.docs.codeEditor()).toBeVisible();
    });

    await test.step('Type markdown and verify syntax highlighting', async () => {
      await locators.docs.codeEditor().click();
      await page.keyboard.type('# Heading');

      await expect(locators.docs.codeEditor().locator('.cm-header')).toBeVisible();
    });
  });
});
