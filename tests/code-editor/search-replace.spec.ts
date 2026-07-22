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
  setCodeEditorSelection,
  scrollCodeEditorToLine,
  getCodeEditorScrollTop,
  appendTextToCodeEditor
} from '../utils/page';
import process from 'node:process';

const cmdKey = process.platform === 'darwin' ? 'Meta' : 'Control';
const EDITOR_ID = 'pre-request-script-editor';
const COLLECTION = 'search-replace-test';
const REQUEST = 'SearchRequest';

const LARGE_DOC = Array.from(
  { length: 200 },
  (_, i) =>
    `## Section ${i + 1}\n\n`
    + `Lorem ipsum dolor sit amet, consectetur adipiscing elit. lorem paragraph ${i + 1}.\n`
    + `Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n`
).join('\n');

/**
 * Assertion helper — calls expect so it stays in the spec, not the page module.
 */
async function expectMatchCount(page: Page, expected: string) {
  const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
  await expect(loc.matchCount()).toHaveText(expected, { timeout: 1500 });
}

// Serial so each test sees the editor state left by the previous one (shared CM instance).
test.describe.serial('CodeEditor Search/Replace', () => {
  // Create the collection + request once and seed the editor with LARGE_DOC.
  test.beforeAll(async ({ page, createTmpDir }) => {
    const tmpDir = await createTmpDir('search-replace');
    await createCollection(page, COLLECTION, tmpDir);
    await createRequest(page, REQUEST, COLLECTION);
    await openPreRequestScriptEditor(page, EDITOR_ID);
    await setCodeEditorContent(page, EDITOR_ID, LARGE_DOC);
  });

  // Remove the collection so the workspace is clean for the next suite.
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  // Dismiss any leftover search bar and restore the full document before each test.
  test.beforeEach(async ({ page }) => {
    const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
    await openPreRequestScriptEditor(page, EDITOR_ID);
    if (await loc.searchBar().isVisible()) {
      await loc.searchCloseBtn().click();
      await loc.searchBar().waitFor({ state: 'hidden' });
    }
    await setCodeEditorContent(page, EDITOR_ID, LARGE_DOC);
  });

  test('Cmd+F opens the search bar', async ({ page }) => {
    const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
    await test.step('Open search bar via Cmd+F', async () => {
      await openCodeEditorSearchBar(page, EDITOR_ID);
    });
    await test.step('Search bar is visible', async () => {
      await expect(loc.searchBar()).toBeVisible();
    });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('Escape closes the search bar', async ({ page }) => {
    const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
    await test.step('Open search bar', async () => {
      await openCodeEditorSearchBar(page, EDITOR_ID);
    });
    await test.step('Press Escape', async () => {
      await page.keyboard.press('Escape');
    });
    await test.step('Search bar is hidden', async () => {
      await expect(loc.searchBar()).toBeHidden();
    });
  });

  test('close button closes the search bar', async ({ page }) => {
    const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
    await test.step('Open search bar', async () => {
      await openCodeEditorSearchBar(page, EDITOR_ID);
    });
    await test.step('Click close button', async () => {
      await loc.searchCloseBtn().click();
    });
    await test.step('Search bar is hidden', async () => {
      await expect(loc.searchBar()).toBeHidden();
    });
  });

  test('search input is auto-focused on open', async ({ page }) => {
    const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
    await test.step('Open search bar', async () => {
      await openCodeEditorSearchBar(page, EDITOR_ID);
    });
    await test.step('Search input has focus', async () => {
      await expect(loc.searchInput()).toBeFocused();
    });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('Cmd+F with text selected pre-fills the search input', async ({ page }) => {
    const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
    await test.step('Select text in editor and open search bar', async () => {
      await openPreRequestScriptEditor(page, EDITOR_ID);
      await setCodeEditorSelection(page, EDITOR_ID, { line: 0, ch: 3 }, { line: 0, ch: 10 });
      await page.keyboard.press(`${cmdKey}+f`);
      await loc.searchBar().waitFor({ state: 'visible' });
    });
    await test.step('Search input is pre-filled with selected text and shows 1 match', async () => {
      await expect(loc.searchInput()).toHaveValue('Section');
      await expectMatchCount(page, '1 / 200');
    });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('typing finds all matches in the document', async ({ page }) => {
    const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
    await test.step('Open search bar and type "lorem"', async () => {
      await openCodeEditorSearchBar(page, EDITOR_ID);
      await loc.searchInput().fill('lorem');
    });
    await test.step('Match count shows 400 results', async () => {
      await expect(loc.matchCount()).toContainText('/ 400', { timeout: 1500 });
    });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('unknown term shows 0 results', async ({ page }) => {
    const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
    await test.step('Open search bar and type unknown term', async () => {
      await openCodeEditorSearchBar(page, EDITOR_ID);
      await loc.searchInput().fill('xyznothere');
    });
    await test.step('Match count shows 0 results', async () => {
      await expect(loc.matchCount()).toHaveText('0 results', { timeout: 1500 });
    });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('clearing the search input resets match count', async ({ page }) => {
    const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
    await test.step('Search for "lorem" and confirm matches', async () => {
      await openCodeEditorSearchBar(page, EDITOR_ID);
      await loc.searchInput().fill('lorem');
      await expectMatchCount(page, '1 / 400');
    });
    await test.step('Clear the input', async () => {
      await loc.searchInput().fill('');
    });
    await test.step('Match count resets to 0 results', async () => {
      await expect(loc.matchCount()).toHaveText('0 results', { timeout: 1500 });
    });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('Enter navigates to next match', async ({ page }) => {
    const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
    await test.step('Search for "Section" and confirm first match', async () => {
      await openCodeEditorSearchBar(page, EDITOR_ID);
      await loc.searchInput().fill('Section');
      await expectMatchCount(page, '1 / 200');
    });
    await test.step('Press Enter twice to advance to match 3', async () => {
      await page.keyboard.press('Enter');
      await expectMatchCount(page, '2 / 200');
      await page.keyboard.press('Enter');
      await expectMatchCount(page, '3 / 200');
    });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('Shift+Enter goes to previous match and wraps from 1 to last', async ({ page }) => {
    const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
    await test.step('Search for "Section" and confirm first match', async () => {
      await openCodeEditorSearchBar(page, EDITOR_ID);
      await loc.searchInput().fill('Section');
      await expectMatchCount(page, '1 / 200');
    });
    await test.step('Shift+Enter wraps to last match', async () => {
      await page.keyboard.press('Shift+Enter');
      await expectMatchCount(page, '200 / 200');
    });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('Next/Prev buttons wrap around', async ({ page }) => {
    const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
    await test.step('Search for "lorem" and confirm first match', async () => {
      await openCodeEditorSearchBar(page, EDITOR_ID);
      await loc.searchInput().fill('lorem');
      await expectMatchCount(page, '1 / 400');
    });
    await test.step('Prev wraps to last match, Next wraps back to first', async () => {
      await loc.searchPrevBtn().click();
      await expectMatchCount(page, '400 / 400');
      await loc.searchNextBtn().click();
      await expectMatchCount(page, '1 / 400');
    });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('search anchors to cursor position when opened mid-document', async ({ page }) => {
    const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
    await test.step('Position cursor at line 500 and open search bar', async () => {
      await openPreRequestScriptEditor(page, EDITOR_ID);
      await setCodeEditorCursor(page, EDITOR_ID, { line: 500, ch: 0 }, true);
      await page.keyboard.press(`${cmdKey}+f`);
      await loc.searchBar().waitFor({ state: 'visible' });
      await setCodeEditorCursor(page, EDITOR_ID, { line: 500, ch: 0 });
    });
    await test.step('First match is anchored at Section 101', async () => {
      await loc.searchInput().fill('Section');
      await expectMatchCount(page, '101 / 200');
    });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('reopening restores previous search text and resumes from cursor at close', async ({ page }) => {
    const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
    await test.step('Search and navigate to match 3, then close', async () => {
      await openCodeEditorSearchBar(page, EDITOR_ID);
      await loc.searchInput().fill('Section');
      await expectMatchCount(page, '1 / 200');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await expectMatchCount(page, '3 / 200');
      await closeCodeEditorSearchBar(page, EDITOR_ID);
    });
    await test.step('Reopen — text is preserved and match resumes from Section 3', async () => {
      await page.keyboard.press(`${cmdKey}+f`);
      await loc.searchBar().waitFor({ state: 'visible' });
      await expect(loc.searchInput()).toHaveValue('Section');
      await expectMatchCount(page, '3 / 200');
    });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('reopening after moving cursor starts from the new cursor position', async ({ page }) => {
    const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
    await test.step('Search and close, leaving cursor at start', async () => {
      await openCodeEditorSearchBar(page, EDITOR_ID);
      await loc.searchInput().fill('Section');
      await expectMatchCount(page, '1 / 200');
      await closeCodeEditorSearchBar(page, EDITOR_ID);
    });
    await test.step('Move cursor to line 500 and reopen', async () => {
      await setCodeEditorCursor(page, EDITOR_ID, { line: 500, ch: 0 }, true);
      await page.keyboard.press(`${cmdKey}+f`);
      await loc.searchBar().waitFor({ state: 'visible' });
    });
    await test.step('First match anchors to new cursor position (Section 101)', async () => {
      await expectMatchCount(page, '101 / 200');
    });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('reopening the search bar does not scroll away from the current viewport', async ({ page }) => {
    const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
    await test.step('Search and close, leaving a match selected', async () => {
      await openCodeEditorSearchBar(page, EDITOR_ID);
      await loc.searchInput().fill('Section');
      await expectMatchCount(page, '1 / 200');
      await closeCodeEditorSearchBar(page, EDITOR_ID);
    });
    await test.step('Scroll to line 500 and record scroll position', async () => {
      await scrollCodeEditorToLine(page, EDITOR_ID, 500);
    });
    const scrollBefore = await getCodeEditorScrollTop(page, EDITOR_ID);
    await test.step('Reopen — scroll position is preserved', async () => {
      await page.keyboard.press(`${cmdKey}+f`);
      await loc.searchBar().waitFor({ state: 'visible' });
      const scrollAfter = await getCodeEditorScrollTop(page, EDITOR_ID);
      expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(50);
    });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('case-sensitive toggle halves matches for mixed-case term', async ({ page }) => {
    const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
    await test.step('Search for "lorem" (case-insensitive) — 400 matches', async () => {
      await openCodeEditorSearchBar(page, EDITOR_ID);
      await loc.searchInput().fill('lorem');
      await expectMatchCount(page, '1 / 400');
    });
    await test.step('Enable case-sensitive — 200 matches', async () => {
      await loc.searchCaseBtn().click();
      await expectMatchCount(page, '1 / 200');
    });
    await test.step('Disable case-sensitive — back to 400 matches', async () => {
      await loc.searchCaseBtn().click();
      await expectMatchCount(page, '1 / 400');
    });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('replace single replaces current match and advances to next', async ({ page }) => {
    const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
    await test.step('Set up content and search for "foo"', async () => {
      await setCodeEditorContent(page, EDITOR_ID, 'foo bar foo baz foo');
      await openCodeEditorReplaceBar(page, EDITOR_ID);
      await loc.searchInput().fill('foo');
      await expectMatchCount(page, '1 / 3');
    });
    await test.step('Replace first match with "qux" — advances to next', async () => {
      await loc.replaceInput().fill('qux');
      await loc.replaceBtn().click();
      await expectMatchCount(page, '1 / 2');
    });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('replace all replaces every match', async ({ page }) => {
    const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
    await test.step('Set up content and search for "foo"', async () => {
      await setCodeEditorContent(page, EDITOR_ID, 'foo bar foo baz foo');
      await openCodeEditorReplaceBar(page, EDITOR_ID);
      await loc.searchInput().fill('foo');
      await expectMatchCount(page, '1 / 3');
    });
    await test.step('Replace all with "qux" — no matches remain', async () => {
      await loc.replaceInput().fill('qux');
      await loc.replaceAllBtn().click();
      await expect(loc.matchCount()).toHaveText('0 results', { timeout: 1500 });
    });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
    await setCodeEditorContent(page, EDITOR_ID, LARGE_DOC);
  });

  test('match count updates when the document is edited while search is open', async ({ page }) => {
    const loc = buildCommonLocators(page).codeEditorSearch(EDITOR_ID);
    await test.step('Set content to "foo bar baz" and search for "foo"', async () => {
      await openPreRequestScriptEditor(page, EDITOR_ID);
      await setCodeEditorContent(page, EDITOR_ID, 'foo bar baz');
      await openCodeEditorSearchBar(page, EDITOR_ID);
      await loc.searchInput().fill('foo');
      await expectMatchCount(page, '1 / 1');
    });
    await test.step('Append " foo" to the document — match count updates to 2', async () => {
      await appendTextToCodeEditor(page, EDITOR_ID, ' foo');
      await expectMatchCount(page, '1 / 2');
    });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
    await setCodeEditorContent(page, EDITOR_ID, LARGE_DOC);
  });
});
