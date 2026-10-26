import { test, expect } from '../../playwright';
import {
  buildCommonLocators,
  clickCodeEditorPosition,
  createCollection,
  createRequest,
  getCodeEditorState,
  selectRequestBodyMode,
  setCodeEditorContent,
  setCodeEditorCursor
} from '../utils/page';

const EDITOR_ID = 'request-body-editor';
const BODY = [
  // Keep editable text below the floating search bar, including in narrow windows.
  '', '', '', '',
  'Hello Abhi, this is a test message for Abhi.',
  'Move the cursor here and continue typing.',
  'Another test message stays unchanged.'
].join('\n');
const cmdKey = process.platform === 'darwin' ? 'Meta' : 'Control';

for (const target of [
  { name: 'elsewhere in the same paragraph', line: 4, ch: 35 },
  { name: 'in another paragraph', line: 5, ch: 20 }
]) {
  test(`typing ${target.name} after searching preserves the cursor`, async ({ newPage: page, createTmpDir }) => {
    const collection = 'search-typing-cursor';
    const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
    const pos = { line: target.line, ch: target.ch };

    await test.step('Open a TEXT body and search for test', async () => {
      const dir = await createTmpDir('search-typing-cursor');
      await createCollection(page, collection, dir);
      await createRequest(page, 'Search cursor regression', collection);
      await selectRequestBodyMode(page, 'TEXT');
      await setCodeEditorContent(page, EDITOR_ID, BODY);
      await setCodeEditorCursor(page, EDITOR_ID, { line: 0, ch: 0 }, true);
      await page.keyboard.press(`${cmdKey}+f`);
      await expect(loc.searchInput()).toBeVisible();
      await loc.searchInput().fill('test');
      await expect(loc.matchCount()).toHaveText('1 / 2');
    });

    await test.step('Click away from the match with the search bar still open', async () => {
      await clickCodeEditorPosition(page, EDITOR_ID, pos);
      await expect.poll(() => getCodeEditorState(page, EDITOR_ID)).toEqual({
        content: BODY, anchor: pos, head: pos
      });
    });

    let expectedContent = BODY;
    let expectedCh = pos.ch;
    for (const [index, text] of [' extra test', ' more test'].entries()) {
      await test.step(`Type "${text}" and retain the insertion point after search refreshes`, async () => {
        // Adding a match makes the result count a synchronization signal for the
        // asynchronous search refresh. An immediate content check could miss the jump.
        await page.keyboard.insertText(text);
        const lines = expectedContent.split('\n');
        lines[pos.line] = lines[pos.line].slice(0, expectedCh) + text + lines[pos.line].slice(expectedCh);
        expectedContent = lines.join('\n');
        expectedCh += text.length;
        await expect(loc.matchCount()).toHaveText(new RegExp(`/ ${index + 3}$`));
        const expectedCursor = { line: pos.line, ch: expectedCh };
        await expect.poll(() => getCodeEditorState(page, EDITOR_ID)).toEqual({
          content: expectedContent, anchor: expectedCursor, head: expectedCursor
        });
        await expect(loc.searchBar()).toBeVisible();
        await expect(loc.searchInput()).toHaveValue('test');
      });
    }
  });
}
