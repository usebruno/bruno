import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';
import { setupRequestDocs, clickDocsToolbarBtn, pasteHtmlIntoRichTextEditor, setMarkdownSource, getMarkdownSource } from './actions';

test.describe('Rich Text Editor Edge Cases - Tables', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Table Insertion', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-table');

    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();

    await clickDocsToolbarBtn(locators, 'Table');

    await expect(prosemirror.locator('table')).toBeVisible();
    await expect(prosemirror.locator('tr')).toHaveCount(3);
  });

  // A table cell's content can legally include a heading/list/code block (only reachable via
  // paste, since GFM cells are single-line in markdown source), but the pipe-table serializer
  // can only inline plain paragraphs — a heading or list block corrupted the single-line row.
  test('A table cell with a pasted heading falls back to an HTML table instead of a corrupted row', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-table-heading-cell');

    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();
    await prosemirror.click();
    await clickDocsToolbarBtn(locators, 'Table');
    await expect(prosemirror.locator('table')).toBeVisible();

    const bodyCell = prosemirror.locator('table tr').nth(1).locator('td').first();
    const bodyCellParagraph = bodyCell.locator('p');

    await test.step('Pasting a heading into a cell renders it in place, not corrupting the table', async () => {
      await bodyCellParagraph.click();
      await page.keyboard.press('Home');
      await pasteHtmlIntoRichTextEditor(locators, '<h2>Cell Heading</h2>', bodyCellParagraph);

      await expect(bodyCell.locator('h2')).toHaveText('Cell Heading');
      await expect(prosemirror.locator('table')).toBeVisible();
    });

    await test.step('Switching to Markdown falls back to an HTML table instead of a broken pipe row', async () => {
      const markdown = await getMarkdownSource(locators);

      expect(markdown).toContain('<table');
      expect(markdown).toContain('Cell Heading');
      expect(markdown).not.toMatch(/^\| .*##/m);
    });

    await test.step('Switching back to Rich Text still shows the heading inside the table', async () => {
      await locators.docs.modeSwitchDocs().click();

      await expect(prosemirror.locator('table')).toBeVisible();
      await expect(prosemirror.locator('table h2')).toHaveText('Cell Heading');
    });
  });

  // An unrecognized inline HTML tag inside a table cell (reachable via typed/loaded markdown,
  // unlike a heading/list which needs a paste) is handled as inline HTML, not a block — it must
  // keep its tag and attributes and the table must stay in GFM pipe format.
  test('A table cell with inline raw HTML keeps its tag and attributes, still as a GFM table', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-table-inline-html-cell');

    await setMarkdownSource(locators, '| a |\n| --- |\n| <div class="note">hi</div> |');

    await test.step('Rich Text renders the tag in place inside the cell', async () => {
      await locators.docs.modeSwitchDocs().click();
      const prosemirror = locators.docs.proseMirror();

      await expect(prosemirror.locator('table')).toBeVisible();
      await expect(prosemirror.locator('table td')).toContainText('hi');
    });

    await test.step('Switching to Markdown keeps the GFM pipe-table format with the tag and attributes inline', async () => {
      const markdown = await getMarkdownSource(locators);

      expect(markdown).toMatch(/^\|.*<div class="note">hi<\/div>.*\|$/m);
      expect(markdown).not.toContain('<table');
    });
  });
});
