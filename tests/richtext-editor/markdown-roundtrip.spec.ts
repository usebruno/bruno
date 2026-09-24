import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';
import { setupRequestDocs, setMarkdownSource, getMarkdownSource } from './actions';

const MARKDOWN_SOURCE = [
  '# Heading 1',
  '',
  'Some **bold** and *italic* and ~~strike~~ text.',
  '',
  '- Bullet one',
  '- Bullet two',
  '',
  '1. Ordered one',
  '2. Ordered two',
  '',
  '- [ ] Task not done',
  '- [x] Task done',
  '',
  '> A quote block',
  '',
  '`inline code`',
  '',
  '```',
  'code block line',
  '```',
  '',
  '| A | B |',
  '| --- | --- |',
  '| 1 | 2 |',
  ''
].join('\n');

test.describe('Rich Text Editor Edge Cases - Markdown Round Trip', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Pre-existing markdown with every block type renders correctly and round-trips back to Markdown', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-roundtrip');

    await setMarkdownSource(locators, MARKDOWN_SOURCE);

    await test.step('Switching to Rich Text renders every block correctly', async () => {
      await locators.docs.modeSwitchDocs().click();
      const prosemirror = locators.docs.proseMirror();
      await expect(prosemirror).toBeVisible();

      await expect(prosemirror.locator('h1')).toContainText('Heading 1');
      await expect(prosemirror.locator('strong')).toContainText('bold');
      await expect(prosemirror.locator('em')).toContainText('italic');
      await expect(prosemirror.locator('s')).toContainText('strike');

      await expect(prosemirror.locator('ul:not([data-type="taskList"]) > li')).toHaveText(['Bullet one', 'Bullet two']);
      await expect(prosemirror.locator('ol > li')).toHaveText(['Ordered one', 'Ordered two']);

      const taskItems = prosemirror.locator('ul[data-type="taskList"] > li');
      await expect(taskItems).toHaveCount(2);
      await expect(taskItems.nth(0).locator('input[type="checkbox"]')).not.toBeChecked();
      await expect(taskItems.nth(1).locator('input[type="checkbox"]')).toBeChecked();

      await expect(prosemirror.locator('blockquote')).toContainText('A quote block');
      await expect(prosemirror.locator('p code')).toHaveText('inline code');
      await expect(prosemirror.locator('pre code')).toContainText('code block line');

      await expect(prosemirror.locator('table')).toBeVisible();
      await expect(prosemirror.locator('th')).toHaveText(['A', 'B']);
      await expect(prosemirror.locator('td')).toHaveText(['1', '2']);
    });

    await test.step('Switching back to Markdown preserves every element without edits', async () => {
      const roundTripped = await getMarkdownSource(locators);

      expect(roundTripped).toContain('Heading 1');
      expect(roundTripped).toContain('Bullet one');
      expect(roundTripped).toContain('Bullet two');
      expect(roundTripped).toContain('Ordered one');
      expect(roundTripped).toContain('Ordered two');
      expect(roundTripped).toContain('[ ]');
      expect(roundTripped).toContain('Task not done');
      expect(roundTripped).toContain('[x]');
      expect(roundTripped).toContain('Task done');
      expect(roundTripped).toContain('A quote block');
      expect(roundTripped).toContain('inline code');
      expect(roundTripped).toContain('code block line');
      expect(roundTripped).toMatch(/\|.*A.*\|.*B.*\|/);
      expect(roundTripped).toMatch(/\|.*1.*\|.*2.*\|/);
    });
  });
});
