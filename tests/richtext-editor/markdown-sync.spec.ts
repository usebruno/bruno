import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';
import { setupRequestDocs } from './actions';

test.describe('Rich Text Editor Edge Cases - Markdown Sync', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Markdown to Rich Text Sync', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-markdown-sync');

    // Switch to Markdown
    await locators.docs.modeSwitchMarkdown().click();
    const codeEditor = locators.docs.codeEditor();
    await expect(codeEditor).toBeVisible();

    // Type in Markdown
    await codeEditor.click();
    await page.keyboard.type('Hello MARKDOWN');
    await expect(codeEditor).toContainText('Hello MARKDOWN');

    // Switch to Rich Text
    await locators.docs.modeSwitchDocs().click();

    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toContainText('Hello MARKDOWN');
  });
});
