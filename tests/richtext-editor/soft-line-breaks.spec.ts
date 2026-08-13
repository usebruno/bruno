import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';
import { setupRequestDocs, setMarkdownSource, getMarkdownSource } from './actions';

const WRAPPED_MARKDOWN_SOURCE = [
  'This line was hand-wrapped for readability but is meant to read as',
  'a single sentence, not a forced line break.',
  ''
].join('\n');

test.describe('Rich Text Editor Edge Cases - Soft Line Breaks', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('A hand-wrapped paragraph reflows as one paragraph and round-trips without gaining a forced break', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-soft-breaks');

    await setMarkdownSource(locators, WRAPPED_MARKDOWN_SOURCE);

    await test.step('Rich Text merges the wrapped lines into a single paragraph with no visible break', async () => {
      await locators.docs.modeSwitchDocs().click();
      const prosemirror = locators.docs.proseMirror();
      await expect(prosemirror).toBeVisible();

      await expect(prosemirror.locator('p')).toHaveCount(1);
      await expect(prosemirror.locator('p br')).toHaveCount(0);
      await expect(prosemirror.locator('p')).toContainText(
        'This line was hand-wrapped for readability but is meant to read as a single sentence, not a forced line break.'
      );
    });

    await test.step('Switching back to Markdown does not insert a forced line break', async () => {
      const roundTripped = await getMarkdownSource(locators);

      expect(roundTripped).not.toContain('\\\n');
      expect(roundTripped).not.toContain('<br');
      expect(roundTripped).toContain('This line was hand-wrapped for readability but is meant to read as');
      expect(roundTripped).toContain('a single sentence, not a forced line break.');
    });
  });
});
