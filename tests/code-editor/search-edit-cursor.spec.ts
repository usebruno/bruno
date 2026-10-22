import { test, expect, Page } from '../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  openPreRequestScriptEditor,
  setCodeEditorContent,
  openCodeEditorSearchBar,
  openCodeEditorReplaceBar,
  closeCodeEditorSearchBar,
  setCodeEditorCursor,
  focusCodeEditor,
  getCodeEditorState,
  replaceAndTypeInCodeEditorImmediately,
  replaceAndCloseCodeEditorSearchBarImmediately
} from '../utils/page';

const EDITOR_ID = 'pre-request-script-editor';
const COLLECTION = 'search-edit-cursor-test';
const REQUEST = 'SearchEditCursorRequest';

const DOC_LINES = [
  'const user = {',
  '  name: \'Ada Lovelace\',',
  '  email: \'ada@example.com\',',
  '  role: \'admin\'',
  '};',
  '',
  'const headers = {',
  '  \'Content-Type\': \'application/json\',',
  '  \'X-Request-Id\': Date.now().toString()',
  '};',
  '',
  'const payload = { name: user.name, active: true };',
  '',
  'bru.setVar(\'userEmail\', user.email);',
  'bru.setVar(\'userRole\', user.role);',
  '',
  'if (!payload.active) {',
  '  throw new Error(\'Inactive user\');',
  '}',
  '',
  'req.setHeader(\'X-User\', user.name);',
  'req.setBody(payload);'
];
const FIRST_MATCH_LINE = 1;
const TWO_MATCH_LINE = 11;
const NO_MATCH_LINE = 14;
const NO_MATCH_LINE_END = { line: NO_MATCH_LINE, ch: DOC_LINES[NO_MATCH_LINE].length };
const EDITED_LINE = `${DOC_LINES[NO_MATCH_LINE]} // named`;
const EDITED_CURSOR = { line: NO_MATCH_LINE, ch: EDITED_LINE.length };
const REPLACED_LINE = DOC_LINES[FIRST_MATCH_LINE].replace('name', 'id');

const docWith = (edits: Record<number, string>) => DOC_LINES.map((line, i) => edits[i] ?? line).join('\n');

async function expectMatchCount(page: Page, expected: string) {
  const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
  await expect(loc.matchCount()).toHaveText(expected, { timeout: 1500 });
}

async function searchForName(page: Page, openBar = openCodeEditorSearchBar) {
  await setCodeEditorContent(page, EDITOR_ID, DOC_LINES.join('\n'));
  await openBar(page, EDITOR_ID);
  await buildCommonLocators(page).codeEditorSearch(EDITOR_ID).searchInput().fill('name');
  await expectMatchCount(page, '1 / 4');
}

async function expectTypedTextAtCursor(page: Page, value: string) {
  const state = await getCodeEditorState(page, EDITOR_ID);
  expect(state.value).toBe(value);
  expect(state.cursor).toEqual(EDITED_CURSOR);
  expect(state.hasSelection).toBe(false);
}

test.describe.serial('CodeEditor search: editing while the search bar is open', () => {
  test.beforeAll(async ({ page, createTmpDir }) => {
    const tmpDir = await createTmpDir('search-edit-cursor');
    await createCollection(page, COLLECTION, tmpDir);
    await createRequest(page, REQUEST, COLLECTION);
    await openPreRequestScriptEditor(page, EDITOR_ID);
  });

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('editing a line without a match keeps the cursor in place', async ({ page }) => {
    await test.step('Search for "name"', async () => {
      await searchForName(page);
    });
    await test.step('Type a new match on a line without one and wait for the search to refresh', async () => {
      await setCodeEditorCursor(page, EDITOR_ID, NO_MATCH_LINE_END, true);
      await page.keyboard.type(' // name');
      await expectMatchCount(page, '5 / 5');
    });
    await test.step('Keep typing: text lands at the cursor and no match is overwritten', async () => {
      await page.keyboard.type('d');
      await expectTypedTextAtCursor(page, docWith({ [NO_MATCH_LINE]: EDITED_LINE }));
    });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('editing past the matches on a line points the current match at the next one after the cursor', async ({ page }) => {
    await test.step('Search for "name"', async () => {
      await searchForName(page);
    });
    await test.step('Type a new match and more text after it at the end of the line with two matches', async () => {
      await setCodeEditorCursor(page, EDITOR_ID, { line: TWO_MATCH_LINE, ch: DOC_LINES[TWO_MATCH_LINE].length }, true);
      await page.keyboard.type(' // name x');
    });
    await test.step('Current match is the next one after the cursor, not one behind it', async () => {
      await expectMatchCount(page, '5 / 5');
    });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('editing right after Replace keeps the cursor in place', async ({ page }) => {
    await test.step('Search for "name" with "id" as the replacement', async () => {
      await searchForName(page, openCodeEditorReplaceBar);
      await buildCommonLocators(page).codeEditorSearch(EDITOR_ID).replaceInput().fill('id');
    });
    await test.step('Replace and type a new match on a line without one before the search refreshes', async () => {
      await replaceAndTypeInCodeEditorImmediately(page, EDITOR_ID, NO_MATCH_LINE_END, ' // name');
      await expectMatchCount(page, '4 / 4');
    });
    await test.step('Keep typing: text lands at the cursor and no match is overwritten', async () => {
      await focusCodeEditor(page, EDITOR_ID);
      await page.keyboard.type('d');
      await expectTypedTextAtCursor(page, docWith({ [FIRST_MATCH_LINE]: REPLACED_LINE, [NO_MATCH_LINE]: EDITED_LINE }));
    });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('editing after closing the bar right after Replace and reopening keeps the cursor in place', async ({ page }) => {
    await test.step('Search for "name" with "id" as the replacement', async () => {
      await searchForName(page, openCodeEditorReplaceBar);
      await buildCommonLocators(page).codeEditorSearch(EDITOR_ID).replaceInput().fill('id');
    });
    await test.step('Replace and close the bar before the search refreshes', async () => {
      await replaceAndCloseCodeEditorSearchBarImmediately(page, EDITOR_ID);
    });
    await test.step('Reopen the bar and type a new match on a line without one', async () => {
      await openCodeEditorSearchBar(page, EDITOR_ID);
      await expectMatchCount(page, '1 / 3');
      await setCodeEditorCursor(page, EDITOR_ID, NO_MATCH_LINE_END, true);
      await page.keyboard.type(' // name');
      await expectMatchCount(page, '4 / 4');
    });
    await test.step('Keep typing: text lands at the cursor and no match is overwritten', async () => {
      await page.keyboard.type('d');
      await expectTypedTextAtCursor(page, docWith({ [FIRST_MATCH_LINE]: REPLACED_LINE, [NO_MATCH_LINE]: EDITED_LINE }));
    });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });
});
