import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';
import { setupRequestDocs, clickDocsToolbarBtn, expectDocsToolbarBtnDisabled } from './actions';

test.describe('Rich Text Editor Edge Cases - Blockquote and Code Block', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Quote toggles a line into a blockquote and back to a paragraph', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-blockquote');
    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();
    await page.keyboard.type('A quoted line');

    await clickDocsToolbarBtn(locators, 'Quote');
    await expect(prosemirror.locator('blockquote')).toContainText('A quoted line');

    await clickDocsToolbarBtn(locators, 'Quote');
    await expect(prosemirror.locator('blockquote')).toHaveCount(0);
    await expect(prosemirror.locator('p').filter({ hasText: 'A quoted line' })).toBeVisible();
  });

  test('Code block converts text to preformatted code and disables re-toggling from inside', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-codeblock');
    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();
    await page.keyboard.type('const x = 1;');

    await clickDocsToolbarBtn(locators, 'Code block');

    await expect(prosemirror.locator('pre > code')).toContainText('const x = 1;');
    // Unlike blockquote/lists, code block has no toolbar-driven "exit" — the
    // action stays disabled while the cursor is inside a code block.
    await expectDocsToolbarBtnDisabled(locators, 'Code block');
  });
});
