import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';
import { setupRequestDocs } from './utils';

test.describe('Wysiwyg Docs Editor Edge Cases - Markdown Sync', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Markdown to WYSIWYG Sync', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-markdown-sync');

    // Switch to Markdown
    await locators.docs.modeSwitchMarkdown().click();
    await page.waitForTimeout(500);

    // Type in Markdown
    const codeEditor = locators.docs.codeEditor();
    await codeEditor.click();

    await page.keyboard.type('Hello MARKDOWN');
    await page.waitForTimeout(500);

    // Switch to WYSIWYG
    await locators.docs.modeSwitchDocs().click();
    await page.waitForTimeout(1000);

    const prosemirror = locators.docs.proseMirror();
    const wysiwygText = await prosemirror.textContent();
    expect(wysiwygText).toContain('Hello MARKDOWN');
  });
});
