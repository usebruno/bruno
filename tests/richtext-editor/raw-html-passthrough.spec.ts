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
});
