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

  const LIST_ITEM_RAW_HTML_SOURCE = [
    '- <div class="callout">Raw HTML alone in a list item</div>',
    `- <video controls width="320" src="${VIDEO_SRC}"/>`,
    '- A normal list item'
  ].join('\n');

  test('A raw HTML block that is the sole content of a list item stays nested in that item', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-list-item-raw-html');

    await setMarkdownSource(locators, LIST_ITEM_RAW_HTML_SOURCE);

    await test.step('Rich Text keeps every item, including the raw-HTML ones, inside the list', async () => {
      await locators.docs.modeSwitchDocs().click();
      const prosemirror = locators.docs.proseMirror();
      await expect(prosemirror).toBeVisible();

      // Before the fix, a list item whose only content was a raw HTML block
      // failed to satisfy the schema's leading-paragraph requirement and was
      // ejected as a sibling after the whole list, leaving an empty item behind.
      const listItems = prosemirror.locator('ul > li');
      await expect(listItems).toHaveCount(3);

      await expect(listItems.nth(0).locator('div.callout')).toHaveText('Raw HTML alone in a list item');
      await expect(listItems.nth(1).locator('.editor-raw-html-block video')).toHaveAttribute('src', VIDEO_SRC);
      await expect(listItems.nth(2)).toHaveText('A normal list item');
    });

    await test.step('Switching back to Markdown round-trips every item, none dropped outside the list', async () => {
      const roundTripped = await getMarkdownSource(locators);

      expect(roundTripped).toContain('- <div class="callout">Raw HTML alone in a list item</div>');
      expect(roundTripped).toContain(`src="${VIDEO_SRC}"`);
      expect(roundTripped).toContain('- A normal list item');
    });
  });

  // A full-viewport overlay (position:fixed + contain: paint escape via <dialog>/popover) is a
  // separate, already-covered security concern; this only guards that closing that gap didn't
  // regress into stripping ordinary styling from existing docs.
  test('A style attribute on raw HTML is preserved, not stripped', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-style-attr');

    await setMarkdownSource(locators, '<div style="color: rgb(255, 0, 0);" class="note">Styled text</div>');

    const styledDiv = locators.docs.proseMirror().locator('div.note');

    await test.step('Rich Text applies the style live, not just preserving it as inert markup', async () => {
      await locators.docs.modeSwitchDocs().click();

      await expect(styledDiv).toBeVisible();
      await expect(styledDiv).toHaveCSS('color', 'rgb(255, 0, 0)');
    });

    await test.step('Editing the text keeps the style attribute in the serialized markdown', async () => {
      await styledDiv.click();
      await page.keyboard.press('End');
      await page.keyboard.type('!');
      await expect(styledDiv).toHaveText('Styled text!');

      const roundTripped = await getMarkdownSource(locators);

      expect(roundTripped).toContain('style="color: rgb(255, 0, 0);"');
    });
  });

  const UNTOUCHED_BLOCK_MARKDOWN_SOURCE = 'Before.\n\n<div class="note">Line one\nLine two</div>\n\nAfter.';

  // The "was this block edited?" check compared against a normalized copy of the original bytes,
  // but ProseMirror collapses whitespace on parse — an unrelated edit anywhere else in the doc
  // used to make every untouched multi-line block fail that check and get rewritten/reformatted.
  test('Editing an unrelated paragraph does not rewrite an untouched multi-line raw HTML block', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-untouched-block');

    await setMarkdownSource(locators, UNTOUCHED_BLOCK_MARKDOWN_SOURCE);
    await locators.docs.modeSwitchDocs().click();

    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror.locator('div.note')).toBeVisible();

    await test.step('Editing the unrelated "After." paragraph leaves the raw HTML block\'s bytes untouched', async () => {
      await prosemirror.locator('p').filter({ hasText: 'After.' }).click();
      await page.keyboard.press('End');
      await page.keyboard.type('!');

      const roundTripped = await getMarkdownSource(locators);

      expect(roundTripped).toContain('<div class="note">Line one\nLine two</div>');
      expect(roundTripped).toContain('After.!');
    });
  });

  const PRE_MARKDOWN_SOURCE = 'Before.\n\n<pre>line one\nline two</pre>\n\nAfter.';

  test('A <pre> block stays opaque (not promoted to an editable text block), preserving its whitespace', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-pre-block');

    await setMarkdownSource(locators, PRE_MARKDOWN_SOURCE);
    await locators.docs.modeSwitchDocs().click();

    const prosemirror = locators.docs.proseMirror();

    await test.step('Rich Text renders the <pre> as an opaque, non-editable block', async () => {
      const preBlock = prosemirror.locator('.editor-raw-html-block pre');
      await expect(preBlock).toBeVisible();
      await expect(prosemirror.locator('pre[data-raw-html-text-block]')).toHaveCount(0);
    });

    await test.step('Switching to Markdown round-trips it byte-for-byte, whitespace intact', async () => {
      const roundTripped = await getMarkdownSource(locators);

      expect(roundTripped).toBe(PRE_MARKDOWN_SOURCE);
    });
  });

  // A DOM/attribute check can't tell whether the overlay actually escapes visually — only what's
  // really painted can. `getBoundingClientRect` is the wrong tool here: vw/vh units resolve
  // against the viewport regardless of `contain: paint`, so the element's computed layout box
  // stays full-size even when properly contained — only its *paint* is clipped. Checking which
  // element is actually painted at a point far outside the panel is what proves containment.
  test('A position:fixed;100vw;100vh style stays visually contained inside the docs panel', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-overlay-containment');

    await setMarkdownSource(
      locators,
      '<div style="position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;background:red" class="note">HOSTILE</div>'
    );
    await locators.docs.modeSwitchDocs().click();

    const hostileDiv = locators.docs.proseMirror().locator('div.note');
    await expect(hostileDiv).toBeVisible();

    // The far top-left corner is always the collections sidebar in this layout, well outside
    // the docs panel; if the overlay escaped, it would paint over this point instead.
    const paintedElementIsHostile = await page.evaluate(
      () => document.elementFromPoint(10, 10)?.closest('.note') !== null
    );

    expect(paintedElementIsHostile).toBe(false);
  });
});
