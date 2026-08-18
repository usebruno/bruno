import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';
import { setupRequestDocs, clickDocsToolbarBtn, setMarkdownSource, getMarkdownSource } from './actions';

test.describe('Rich Text Docs Editor Edge Cases - Lists', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Lists Formatting', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-lists');

    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();
    await page.keyboard.type('Item 1');

    await clickDocsToolbarBtn(locators, 'Bullet list');
    await expect(prosemirror.locator('ul > li')).toContainText('Item 1');

    await page.keyboard.press('Enter');
    await page.keyboard.type('Item 2');

    await clickDocsToolbarBtn(locators, 'Numbered list');
    await expect(prosemirror.locator('ol > li').nth(1)).toContainText('Item 2');

    await clickDocsToolbarBtn(locators, 'Numbered list');
    await expect(prosemirror.locator('p').filter({ hasText: 'Item 2' })).toBeVisible();

    await clickDocsToolbarBtn(locators, 'Task list');
    await expect(prosemirror.locator('ul[data-type="taskList"] > li')).toBeVisible();

    const checkbox = prosemirror.locator('ul[data-type="taskList"] > li label input[type="checkbox"]').first();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  });

  // A loose list item's second paragraph was joined to the first by a bare '\n' on
  // serialization, which reparses as a markdown softbreak (a single space) — silently
  // merging "one" and "two" into a run-on line instead of keeping them visually separate.
  test('A loose list item keeps its second paragraph as a visible line break, not merged text', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-loose-list');

    await setMarkdownSource(locators, '- one\n\n  two');

    const listItem = locators.docs.proseMirror().locator('ul > li');

    await test.step('Rich Text loads the loose list item as two separate paragraphs', async () => {
      await locators.docs.modeSwitchDocs().click();

      await expect(listItem).toBeVisible();
      await expect(listItem.locator('p')).toHaveCount(2);
    });

    // Switching modes alone never re-serializes (the markdown-mode source is only pushed
    // FROM CodeMirror INTO the rich-text editor, never derived back out on a bare toggle) —
    // a real edit is needed to exercise the serializer where the bug lived: a bare '\n'
    // between the two paragraphs reparses as a markdown softbreak (a single space), silently
    // merging "one"/"two" into one word.
    await test.step('Editing the second paragraph and switching to Markdown serializes the boundary as a hard break', async () => {
      await listItem.locator('p').nth(1).click();
      await page.keyboard.press('End');
      await page.keyboard.type('!');
      await expect(listItem.locator('p').nth(1)).toHaveText('two!');

      const roundTripped = await getMarkdownSource(locators);

      expect(roundTripped).toMatch(/- one {2}\n {2}two!/);
    });
  });
});
