import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';
import { setupRequestDocs, clickDocsToolbarBtn } from './actions';
import { modifier, pressShortcut } from '../shortcuts/helpers';

test.describe('Rich Text Docs Editor Edge Cases - Code Blocks', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Code Block Insertion', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-code-insertion');

    await test.step('Insert code block', async () => {
      const prosemirror = locators.docs.proseMirror();
      await expect(prosemirror).toBeVisible();

      await prosemirror.click();
      await clickDocsToolbarBtn(locators, 'Code block');
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
      await clickDocsToolbarBtn(locators, 'Code block');
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
      await clickDocsToolbarBtn(locators, 'Code block');
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
      await clickDocsToolbarBtn(locators, 'Code block');
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

  test('Tab inserts a tab character instead of moving focus out of the code block', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-code-tab');
    const prosemirror = locators.docs.proseMirror();

    await test.step('Create a code block and type before the tab', async () => {
      await expect(prosemirror).toBeVisible();
      await prosemirror.click();
      await clickDocsToolbarBtn(locators, 'Code block');
      await page.keyboard.type('const x =');
    });

    await test.step('Press Tab, then keep typing', async () => {
      await page.keyboard.press('Tab');
      await page.keyboard.type('1;');
    });

    await test.step('A literal tab character was inserted', async () => {
      await expect(locators.docs.codeBlockContent()).toHaveText('const x =\t1;');
    });

    await test.step('Focus stayed inside the editor, so the second line still lands in the code block', async () => {
      await page.keyboard.press('Enter');
      await page.keyboard.type('const y = 2;');
      await expect(locators.docs.codeBlockContent()).toContainText('const y = 2;');
    });
  });

  test('Backspace on an empty code block still removes it', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-code-backspace-remove');
    const prosemirror = locators.docs.proseMirror();

    await test.step('Insert an empty code block', async () => {
      await expect(prosemirror).toBeVisible();
      await prosemirror.click();
      await clickDocsToolbarBtn(locators, 'Code block');
      await expect(locators.docs.codeBlockPre()).toBeVisible();
    });

    await test.step('Backspace on the empty block removes it', async () => {
      await page.keyboard.press('Backspace');
      await expect(locators.docs.codeBlockPre()).toHaveCount(0);
    });
  });

  test('Three consecutive Enters at the end of a code block exits it into a new paragraph', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-code-triple-enter');
    const prosemirror = locators.docs.proseMirror();

    await test.step('Create a code block with content', async () => {
      await expect(prosemirror).toBeVisible();
      await prosemirror.click();
      await clickDocsToolbarBtn(locators, 'Code block');
      await page.keyboard.type('const x = 1;');
    });

    await test.step('Press Enter three times in a row', async () => {
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
    });

    await test.step('The cursor exits into a paragraph after the code block, instead of adding blank lines inside it', async () => {
      await expect(prosemirror.locator('pre')).toHaveCount(1);
      await expect(locators.docs.codeBlockContent()).toHaveText('const x = 1;');
      await page.keyboard.type('after code block');
      await expect(prosemirror.locator('p').last()).toContainText('after code block');
    });
  });

  test('Cmd/Ctrl+Alt+C toggles the current block in and out of a code block', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-code-toggle-shortcut');
    const prosemirror = locators.docs.proseMirror();

    await test.step('Type a paragraph, then toggle it into a code block via the shortcut', async () => {
      await expect(prosemirror).toBeVisible();
      await prosemirror.click();
      await page.keyboard.type('const x = 1;');
      await pressShortcut(page, modifier, 'Alt', 'KeyC');
    });

    await test.step('It becomes a code block', async () => {
      await expect(locators.docs.codeBlockPre()).toBeVisible();
      await expect(locators.docs.codeBlockContent()).toContainText('const x = 1;');
    });

    await test.step('The same shortcut toggles it back to a paragraph', async () => {
      await pressShortcut(page, modifier, 'Alt', 'KeyC');
      await expect(locators.docs.codeBlockPre()).toHaveCount(0);
      await expect(prosemirror.locator('p')).toContainText('const x = 1;');
    });
  });
});
