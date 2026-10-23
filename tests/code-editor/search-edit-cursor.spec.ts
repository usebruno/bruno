import { test, expect } from '../../playwright';
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
  getCodeEditorValueAndCursor,
  replaceMatchThenTypeBeforeSearchRefresh,
  replaceMatchThenCloseSearchBarBeforeRefresh
} from '../utils/page';

const SCRIPT_EDITOR_ID = 'pre-request-script-editor';
const COLLECTION_NAME = 'search-edit-cursor-test';
const REQUEST_NAME = 'SearchEditCursorRequest';

const SCRIPT_LINES = [
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
const SCRIPT = SCRIPT_LINES.join('\n');

const SEARCH_TERM = 'name';
const REPLACEMENT = 'id';
const TEXT_WITH_NEW_MATCH = ` // ${SEARCH_TERM}`;
const NEXT_KEYSTROKE = 'd';

const LINE_WITH_FIRST_MATCH = 1;
const LINE_WITH_TWO_MATCHES = 11;
const LINE_WITHOUT_MATCH = 14;
const END_OF_LINE_WITH_TWO_MATCHES = { line: LINE_WITH_TWO_MATCHES, ch: SCRIPT_LINES[LINE_WITH_TWO_MATCHES].length };
const END_OF_LINE_WITHOUT_MATCH = { line: LINE_WITHOUT_MATCH, ch: SCRIPT_LINES[LINE_WITHOUT_MATCH].length };

const LINE_WITH_FIRST_MATCH_AFTER_REPLACE = SCRIPT_LINES[LINE_WITH_FIRST_MATCH].replace(SEARCH_TERM, REPLACEMENT);
const LINE_WITHOUT_MATCH_AFTER_TYPING = `${SCRIPT_LINES[LINE_WITHOUT_MATCH]}${TEXT_WITH_NEW_MATCH}${NEXT_KEYSTROKE}`;
const CURSOR_AFTER_TYPING = { line: LINE_WITHOUT_MATCH, ch: LINE_WITHOUT_MATCH_AFTER_TYPING.length };

const scriptWithChangedLines = (changedLines: Record<number, string>) =>
  SCRIPT_LINES.map((line, index) => changedLines[index] ?? line).join('\n');

test.describe.serial('CodeEditor search: editing while the search bar is open', () => {
  test.beforeAll(async ({ page, createTmpDir }) => {
    const collectionLocation = await createTmpDir('search-edit-cursor');
    await createCollection(page, COLLECTION_NAME, collectionLocation);
    await createRequest(page, REQUEST_NAME, COLLECTION_NAME);
    await openPreRequestScriptEditor(page, SCRIPT_EDITOR_ID);
  });

  test.afterEach(async ({ page }) => {
    await closeCodeEditorSearchBar(page, SCRIPT_EDITOR_ID);
  });

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Edit a line with no match, keep typing', async ({ page }) => {
    const searchBar = buildCommonLocators(page).codeEditorSearch(SCRIPT_EDITOR_ID);
    await test.step('Load the script and search for "name"', async () => {
      await setCodeEditorContent(page, SCRIPT_EDITOR_ID, SCRIPT);
      await openCodeEditorSearchBar(page, SCRIPT_EDITOR_ID);
      await searchBar.searchInput().fill(SEARCH_TERM);
      await expect(searchBar.matchCount()).toHaveText('1 / 4');
    });
    await test.step('Type a new match at the end of a line without one and wait for the search to refresh', async () => {
      await setCodeEditorCursor(page, SCRIPT_EDITOR_ID, END_OF_LINE_WITHOUT_MATCH, true);
      await page.keyboard.type(TEXT_WITH_NEW_MATCH);
      await expect(searchBar.matchCount()).toHaveText('5 / 5');
    });
    await test.step('Keep typing: text lands at the cursor and no match is overwritten', async () => {
      await page.keyboard.type(NEXT_KEYSTROKE);
      expect(await getCodeEditorValueAndCursor(page, SCRIPT_EDITOR_ID)).toEqual({
        value: scriptWithChangedLines({ [LINE_WITHOUT_MATCH]: LINE_WITHOUT_MATCH_AFTER_TYPING }),
        cursor: CURSOR_AFTER_TYPING,
        hasSelection: false
      });
    });
  });

  test('Edit past two matches on a line', async ({ page }) => {
    const searchBar = buildCommonLocators(page).codeEditorSearch(SCRIPT_EDITOR_ID);
    await test.step('Load the script and search for "name"', async () => {
      await setCodeEditorContent(page, SCRIPT_EDITOR_ID, SCRIPT);
      await openCodeEditorSearchBar(page, SCRIPT_EDITOR_ID);
      await searchBar.searchInput().fill(SEARCH_TERM);
      await expect(searchBar.matchCount()).toHaveText('1 / 4');
    });
    await test.step('Type a new match and more text after it at the end of the line with two matches', async () => {
      await setCodeEditorCursor(page, SCRIPT_EDITOR_ID, END_OF_LINE_WITH_TWO_MATCHES, true);
      await page.keyboard.type(`${TEXT_WITH_NEW_MATCH} x`);
    });
    await test.step('Current match is the first one at or after the cursor', async () => {
      await expect(searchBar.matchCount()).toHaveText('5 / 5');
    });
  });

  test('Edit within 100ms of Replace', async ({ page }) => {
    const searchBar = buildCommonLocators(page).codeEditorSearch(SCRIPT_EDITOR_ID);
    await test.step('Load the script and search for "name" with "id" as the replacement', async () => {
      await setCodeEditorContent(page, SCRIPT_EDITOR_ID, SCRIPT);
      await openCodeEditorReplaceBar(page, SCRIPT_EDITOR_ID);
      await searchBar.searchInput().fill(SEARCH_TERM);
      await expect(searchBar.matchCount()).toHaveText('1 / 4');
      await searchBar.replaceInput().fill(REPLACEMENT);
    });
    await test.step('Replace and, within 100ms, type a new match at the end of a line without one', async () => {
      await replaceMatchThenTypeBeforeSearchRefresh(page, SCRIPT_EDITOR_ID, END_OF_LINE_WITHOUT_MATCH, TEXT_WITH_NEW_MATCH);
      await expect(searchBar.matchCount()).toHaveText('4 / 4');
    });
    await test.step('Keep typing: text lands at the cursor and no match is overwritten', async () => {
      await focusCodeEditor(page, SCRIPT_EDITOR_ID);
      await page.keyboard.type(NEXT_KEYSTROKE);
      expect(await getCodeEditorValueAndCursor(page, SCRIPT_EDITOR_ID)).toEqual({
        value: scriptWithChangedLines({
          [LINE_WITH_FIRST_MATCH]: LINE_WITH_FIRST_MATCH_AFTER_REPLACE,
          [LINE_WITHOUT_MATCH]: LINE_WITHOUT_MATCH_AFTER_TYPING
        }),
        cursor: CURSOR_AFTER_TYPING,
        hasSelection: false
      });
    });
  });

  test('Replace, close the search bar within 100ms, reopen, edit', async ({ page }) => {
    const searchBar = buildCommonLocators(page).codeEditorSearch(SCRIPT_EDITOR_ID);
    await test.step('Load the script and search for "name" with "id" as the replacement', async () => {
      await setCodeEditorContent(page, SCRIPT_EDITOR_ID, SCRIPT);
      await openCodeEditorReplaceBar(page, SCRIPT_EDITOR_ID);
      await searchBar.searchInput().fill(SEARCH_TERM);
      await expect(searchBar.matchCount()).toHaveText('1 / 4');
      await searchBar.replaceInput().fill(REPLACEMENT);
    });
    await test.step('Replace and close the search bar within 100ms', async () => {
      await replaceMatchThenCloseSearchBarBeforeRefresh(page, SCRIPT_EDITOR_ID);
    });
    await test.step('Reopen the search bar and type a new match at the end of a line without one', async () => {
      await openCodeEditorSearchBar(page, SCRIPT_EDITOR_ID);
      await expect(searchBar.matchCount()).toHaveText('1 / 3');
      await setCodeEditorCursor(page, SCRIPT_EDITOR_ID, END_OF_LINE_WITHOUT_MATCH, true);
      await page.keyboard.type(TEXT_WITH_NEW_MATCH);
      await expect(searchBar.matchCount()).toHaveText('4 / 4');
    });
    await test.step('Keep typing: text lands at the cursor and no match is overwritten', async () => {
      await page.keyboard.type(NEXT_KEYSTROKE);
      expect(await getCodeEditorValueAndCursor(page, SCRIPT_EDITOR_ID)).toEqual({
        value: scriptWithChangedLines({
          [LINE_WITH_FIRST_MATCH]: LINE_WITH_FIRST_MATCH_AFTER_REPLACE,
          [LINE_WITHOUT_MATCH]: LINE_WITHOUT_MATCH_AFTER_TYPING
        }),
        cursor: CURSOR_AFTER_TYPING,
        hasSelection: false
      });
    });
  });
});
