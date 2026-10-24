import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';
import { setupRequestDocs, setMarkdownSource, getMarkdownSource } from './actions';

const VIDEO_SRC = 'https://example.com/movie.mp4';

const MARKDOWN_SOURCE = [
  'Some text before the raw HTML.',
  '',
  `<video controls width="320" src="${VIDEO_SRC}"/>`,
  '',
  '<details>',
  '<summary>More info</summary>',
  'Hidden details content',
  '</details>',
  '',
  'Some text after the raw HTML.',
  ''
].join('\n');

test.describe('Rich Text Editor Edge Cases - Raw HTML Passthrough', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('A video tag and a details block have no dedicated node, but still render and round-trip via the raw HTML passthrough', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-raw-html');

    await setMarkdownSource(locators, MARKDOWN_SOURCE);

    await test.step('Rich Text renders the raw HTML blocks', async () => {
      await locators.docs.modeSwitchDocs().click();
      const prosemirror = locators.docs.proseMirror();
      await expect(prosemirror).toBeVisible();
      await expect(prosemirror).toContainText('Some text before the raw HTML.');
      await expect(prosemirror).toContainText('Some text after the raw HTML.');

      const video = prosemirror.locator('.editor-raw-html-block video');
      await expect(video).toBeVisible();
      await expect(video).toHaveAttribute('src', VIDEO_SRC);
      expect(await video.getAttribute('controls')).not.toBeNull();

      const details = prosemirror.locator('.editor-raw-html-block details');
      await expect(details).toBeVisible();
      await expect(details.locator('summary')).toHaveText('More info');
      await expect(details).toContainText('Hidden details content');
    });

    await test.step('Switching back to Markdown round-trips the raw HTML byte-for-byte', async () => {
      const roundTripped = await getMarkdownSource(locators);

      expect(roundTripped).toContain('<video');
      expect(roundTripped).toContain(`src="${VIDEO_SRC}"`);
      expect(roundTripped).toContain('controls');
      expect(roundTripped).toContain('<details>');
      expect(roundTripped).toContain('<summary>More info</summary>');
      expect(roundTripped).toContain('Hidden details content');
    });
  });

  const INLINE_MARKDOWN_SOURCE = [
    'Some text with <mark>highlighted</mark> and <u>underlined</u> inline HTML.',
    '',
    'Keyboard shortcut <kbd>Ctrl</kbd>+<kbd>C</kbd> and water is H<sup>2</sup>O.',
    '',
    '- [ ] Task not done',
    '- [x] Task done',
    ''
  ].join('\n');

  test('Inline HTML with no dedicated mark is not dropped, and tags that do have one (kbd, sup, task checkboxes) keep working', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-inline-raw-html');

    await setMarkdownSource(locators, INLINE_MARKDOWN_SOURCE);

    await test.step('Rich Text keeps the unrecognized inline HTML\'s text instead of dropping it', async () => {
      await locators.docs.modeSwitchDocs().click();
      const prosemirror = locators.docs.proseMirror();
      await expect(prosemirror).toBeVisible();

      await expect(prosemirror).toContainText('highlighted');
      await expect(prosemirror).toContainText('underlined');
      // <mark>/</mark> and <u>/</u> each become their own opaque placeholder
      // (no dedicated node maps to them), one per open and close tag.
      await expect(prosemirror.locator('.editor-raw-html-inline')).toHaveCount(4);
    });

    await test.step('Recognized inline tags render as themselves, not as raw-HTML placeholders', async () => {
      const prosemirror = locators.docs.proseMirror();

      await expect(prosemirror.locator('kbd')).toHaveText(['Ctrl', 'C']);
      await expect(prosemirror.locator('sup')).toHaveText('2');
      await expect(prosemirror.locator('.editor-raw-html-inline kbd')).toHaveCount(0);
      await expect(prosemirror.locator('.editor-raw-html-inline sup')).toHaveCount(0);
    });

    await test.step('The task list checkboxes still parse as real, checkable task items', async () => {
      const prosemirror = locators.docs.proseMirror();
      const taskItems = prosemirror.locator('ul[data-type="taskList"] > li');

      await expect(taskItems).toHaveCount(2);
      await expect(taskItems.nth(0).locator('input[type="checkbox"]')).not.toBeChecked();
      await expect(taskItems.nth(1).locator('input[type="checkbox"]')).toBeChecked();
      await expect(prosemirror.locator('.editor-raw-html-inline input')).toHaveCount(0);
    });

    await test.step('Switching back to Markdown round-trips every tag byte-for-byte', async () => {
      const roundTripped = await getMarkdownSource(locators);

      expect(roundTripped).toContain('<mark>highlighted</mark>');
      expect(roundTripped).toContain('<u>underlined</u>');
      expect(roundTripped).toContain('<kbd>Ctrl</kbd>');
      expect(roundTripped).toContain('<kbd>C</kbd>');
      expect(roundTripped).toContain('H<sup>2</sup>O');
      expect(roundTripped).toContain('[ ] Task not done');
      expect(roundTripped).toContain('[x] Task done');
    });
  });

  const TEXT_BLOCK_MARKDOWN_SOURCE = [
    'Before the block.',
    '',
    '<div class="note">Some plain text</div>',
    '',
    'After the block.',
    ''
  ].join('\n');

  test('A plain-text block tag like <div> is editable in place, unlike a non-text raw HTML block', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-text-block');

    await setMarkdownSource(locators, TEXT_BLOCK_MARKDOWN_SOURCE);

    await locators.docs.modeSwitchDocs().click();
    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    const textBlock = prosemirror.locator('div.note');

    await test.step('The <div> renders as real, editable content, not an opaque atom', async () => {
      await expect(textBlock).toHaveText('Some plain text');
      await expect(textBlock).not.toHaveClass(/editor-raw-html-block/);
      // The opaque raw-HTML atom explicitly sets contentEditable="false"; this
      // node never does, so it inherits editability from the ProseMirror root.
      await expect(textBlock).not.toHaveAttribute('contenteditable', 'false');
    });

    await test.step('Typing inside it actually edits the text', async () => {
      await textBlock.click();
      await page.keyboard.press('End');
      await page.keyboard.type(' EDITED');
      await expect(textBlock).toHaveText('Some plain text EDITED');
    });

    await test.step('Shift+Enter inserts a line break inside the block', async () => {
      await page.keyboard.down('Shift');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Shift');
      await page.keyboard.type('Second line');

      await expect(textBlock.locator('br')).toHaveCount(1);
      // Still one block-level div, not split into two.
      await expect(textBlock).toHaveCount(1);
    });

    await test.step('The edit round-trips, still wrapped in the original tag and attributes', async () => {
      const roundTripped = await getMarkdownSource(locators);

      expect(roundTripped).toContain('<div class="note">Some plain text EDITED<br>Second line</div>');
      expect(roundTripped).toContain('Before the block.');
      expect(roundTripped).toContain('After the block.');
    });
  });
});
