import { test, expect, Page } from '../../playwright';
import { closeAllCollections, createCollection, createRequest } from '../utils/page';
import {
  buildCodeEditorSearchLocators,
  openPreRequestScriptEditor,
  setCodeEditorContent,
  openCodeEditorSearchBar,
  openCodeEditorReplaceBar,
  closeCodeEditorSearchBar
} from '../utils/page/code-editor-search';
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
  const loc = buildCodeEditorSearchLocators(page, EDITOR_ID);
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
    const loc = buildCodeEditorSearchLocators(page, EDITOR_ID);
    await openPreRequestScriptEditor(page, EDITOR_ID);
    if (await loc.searchBar().isVisible()) {
      await loc.searchCloseBtn().click();
      await loc.searchBar().waitFor({ state: 'hidden' });
    }
    await setCodeEditorContent(page, EDITOR_ID, LARGE_DOC);
  });

  test('Cmd+F opens the search bar', async ({ page }) => {
    const loc = buildCodeEditorSearchLocators(page, EDITOR_ID);
    await openCodeEditorSearchBar(page, EDITOR_ID);
    await expect(loc.searchBar()).toBeVisible();
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('Escape closes the search bar', async ({ page }) => {
    const loc = buildCodeEditorSearchLocators(page, EDITOR_ID);
    await openCodeEditorSearchBar(page, EDITOR_ID);
    await page.keyboard.press('Escape');
    await expect(loc.searchBar()).toBeHidden();
  });

  test('close button closes the search bar', async ({ page }) => {
    const loc = buildCodeEditorSearchLocators(page, EDITOR_ID);
    await openCodeEditorSearchBar(page, EDITOR_ID);
    await loc.searchCloseBtn().click();
    await expect(loc.searchBar()).toBeHidden();
  });

  test('search input is auto-focused on open', async ({ page }) => {
    const loc = buildCodeEditorSearchLocators(page, EDITOR_ID);
    await openCodeEditorSearchBar(page, EDITOR_ID);
    await expect(loc.searchInput()).toBeFocused();
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('Cmd+F with text selected pre-fills the search input', async ({ page }) => {
    const loc = buildCodeEditorSearchLocators(page, EDITOR_ID);
    await openPreRequestScriptEditor(page, EDITOR_ID);
    await loc.codeMirror().evaluate((el: any) => {
      if (el.CodeMirror) {
        el.CodeMirror.setSelection({ line: 0, ch: 3 }, { line: 0, ch: 10 });
        el.CodeMirror.focus();
      }
    });
    await page.keyboard.press(`${cmdKey}+f`);
    await loc.searchBar().waitFor({ state: 'visible' });
    await expect(loc.searchInput()).toHaveValue('Section');
    await expectMatchCount(page, '1 / 200');
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('typing finds all matches in the document', async ({ page }) => {
    const loc = buildCodeEditorSearchLocators(page, EDITOR_ID);
    await openCodeEditorSearchBar(page, EDITOR_ID);
    await loc.searchInput().fill('lorem');
    await expect(loc.matchCount()).toContainText('/ 400', { timeout: 1500 });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('unknown term shows 0 results', async ({ page }) => {
    const loc = buildCodeEditorSearchLocators(page, EDITOR_ID);
    await openCodeEditorSearchBar(page, EDITOR_ID);
    await loc.searchInput().fill('xyznothere');
    await expect(loc.matchCount()).toHaveText('0 results', { timeout: 1500 });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('clearing the search input resets match count', async ({ page }) => {
    const loc = buildCodeEditorSearchLocators(page, EDITOR_ID);
    await openCodeEditorSearchBar(page, EDITOR_ID);
    await loc.searchInput().fill('lorem');
    await expectMatchCount(page, '1 / 400');
    await loc.searchInput().fill('');
    await expect(loc.matchCount()).toHaveText('0 results', { timeout: 1500 });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('Enter navigates to next match', async ({ page }) => {
    const loc = buildCodeEditorSearchLocators(page, EDITOR_ID);
    await openCodeEditorSearchBar(page, EDITOR_ID);
    await loc.searchInput().fill('Section');
    await expectMatchCount(page, '1 / 200');
    await page.keyboard.press('Enter');
    await expectMatchCount(page, '2 / 200');
    await page.keyboard.press('Enter');
    await expectMatchCount(page, '3 / 200');
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('Shift+Enter goes to previous match and wraps from 1 to last', async ({ page }) => {
    const loc = buildCodeEditorSearchLocators(page, EDITOR_ID);
    await openCodeEditorSearchBar(page, EDITOR_ID);
    await loc.searchInput().fill('Section');
    await expectMatchCount(page, '1 / 200');
    await page.keyboard.press('Shift+Enter');
    await expectMatchCount(page, '200 / 200');
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('Next/Prev buttons wrap around', async ({ page }) => {
    const loc = buildCodeEditorSearchLocators(page, EDITOR_ID);
    await openCodeEditorSearchBar(page, EDITOR_ID);
    await loc.searchInput().fill('lorem');
    await expectMatchCount(page, '1 / 400');
    await loc.searchPrevBtn().click();
    await expectMatchCount(page, '400 / 400');
    await loc.searchNextBtn().click();
    await expectMatchCount(page, '1 / 400');
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('search anchors to cursor position when opened mid-document', async ({ page }) => {
    const loc = buildCodeEditorSearchLocators(page, EDITOR_ID);
    await openPreRequestScriptEditor(page, EDITOR_ID);
    await loc.codeMirror().evaluate((el: any) => {
      if (el.CodeMirror) {
        el.CodeMirror.setCursor({ line: 500, ch: 0 });
        el.CodeMirror.focus();
      }
    });
    await page.keyboard.press(`${cmdKey}+f`);
    await loc.searchBar().waitFor({ state: 'visible' });
    await loc.codeMirror().evaluate((el: any) => {
      if (el.CodeMirror) el.CodeMirror.setCursor({ line: 500, ch: 0 });
    });
    await loc.searchInput().fill('Section');
    await expectMatchCount(page, '101 / 200');
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('reopening restores previous search text and resumes from cursor at close', async ({ page }) => {
    const loc = buildCodeEditorSearchLocators(page, EDITOR_ID);
    await openCodeEditorSearchBar(page, EDITOR_ID);
    await loc.searchInput().fill('Section');
    await expectMatchCount(page, '1 / 200');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expectMatchCount(page, '3 / 200');
    await closeCodeEditorSearchBar(page, EDITOR_ID);

    await page.keyboard.press(`${cmdKey}+f`);
    await loc.searchBar().waitFor({ state: 'visible' });
    // Text is preserved; match resumes from Section 3 where the cursor was left
    await expect(loc.searchInput()).toHaveValue('Section');
    await expectMatchCount(page, '3 / 200');
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('reopening after moving cursor starts from the new cursor position', async ({ page }) => {
    const loc = buildCodeEditorSearchLocators(page, EDITOR_ID);
    await openCodeEditorSearchBar(page, EDITOR_ID);
    await loc.searchInput().fill('Section');
    await expectMatchCount(page, '1 / 200');
    await closeCodeEditorSearchBar(page, EDITOR_ID);

    // Simulate scroll + click somewhere else in the document, cursor moves to Section 101 (line 500)
    await loc.codeMirror().evaluate((el: any) => {
      if (el.CodeMirror) {
        el.CodeMirror.setCursor({ line: 500, ch: 0 });
        el.CodeMirror.focus();
      }
    });
    await page.keyboard.press(`${cmdKey}+f`);
    await loc.searchBar().waitFor({ state: 'visible' });
    await expectMatchCount(page, '101 / 200');
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('reopening the search bar does not scroll away from the current viewport', async ({ page }) => {
    const loc = buildCodeEditorSearchLocators(page, EDITOR_ID);
    // Search, navigate to a match, then close — leaving the match text selected in the editor
    await openCodeEditorSearchBar(page, EDITOR_ID);
    await loc.searchInput().fill('Section');
    await expectMatchCount(page, '1 / 200');
    await closeCodeEditorSearchBar(page, EDITOR_ID);

    // Scroll to the middle of the document without moving the cursor
    await loc.codeMirror().evaluate((el: any) => {
      if (el.CodeMirror) {
        el.CodeMirror.scrollTo(null, el.CodeMirror.heightAtLine(500, 'local'));
      }
    });
    const scrollBefore = await loc.codeMirror().evaluate((el: any) => el.CodeMirror?.getScrollInfo().top ?? 0);

    // Reopen — previously this would re-detect the selected match text and scroll back to it
    await page.keyboard.press(`${cmdKey}+f`);
    await loc.searchBar().waitFor({ state: 'visible' });
    const scrollAfter = await loc.codeMirror().evaluate((el: any) => el.CodeMirror?.getScrollInfo().top ?? 0);
    expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(50);

    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('case-sensitive toggle halves matches for mixed-case term', async ({ page }) => {
    const loc = buildCodeEditorSearchLocators(page, EDITOR_ID);
    await openCodeEditorSearchBar(page, EDITOR_ID);
    await loc.searchInput().fill('lorem');
    await expectMatchCount(page, '1 / 400');
    await loc.searchCaseBtn().click();
    await expectMatchCount(page, '1 / 200');
    await loc.searchCaseBtn().click();
    await expectMatchCount(page, '1 / 400');
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('replace single replaces current match and advances to next', async ({ page }) => {
    const loc = buildCodeEditorSearchLocators(page, EDITOR_ID);
    await setCodeEditorContent(page, EDITOR_ID, 'foo bar foo baz foo');
    await openCodeEditorReplaceBar(page, EDITOR_ID);
    await loc.searchInput().fill('foo');
    await expectMatchCount(page, '1 / 3');
    await loc.replaceInput().fill('qux');
    await loc.replaceBtn().click();
    await expectMatchCount(page, '1 / 2');
    await closeCodeEditorSearchBar(page, EDITOR_ID);
  });

  test('replace all replaces every match', async ({ page }) => {
    const loc = buildCodeEditorSearchLocators(page, EDITOR_ID);
    await setCodeEditorContent(page, EDITOR_ID, 'foo bar foo baz foo');
    await openCodeEditorReplaceBar(page, EDITOR_ID);
    await loc.searchInput().fill('foo');
    await expectMatchCount(page, '1 / 3');
    await loc.replaceInput().fill('qux');
    await loc.replaceAllBtn().click();
    await expect(loc.matchCount()).toHaveText('0 results', { timeout: 1500 });
    await closeCodeEditorSearchBar(page, EDITOR_ID);
    await setCodeEditorContent(page, EDITOR_ID, LARGE_DOC);
  });

  test('match count updates when the document is edited while search is open', async ({ page }) => {
    const loc = buildCodeEditorSearchLocators(page, EDITOR_ID);
    await openPreRequestScriptEditor(page, EDITOR_ID);
    await setCodeEditorContent(page, EDITOR_ID, 'foo bar baz');
    await openCodeEditorSearchBar(page, EDITOR_ID);
    await loc.searchInput().fill('foo');
    await expectMatchCount(page, '1 / 1');
    await loc.codeMirror().evaluate((el: any) => {
      if (el.CodeMirror) {
        const lastLine = el.CodeMirror.lastLine();
        const lastCh = el.CodeMirror.getLine(lastLine).length;
        el.CodeMirror.replaceRange(' foo', { line: lastLine, ch: lastCh });
      }
    });
    await expectMatchCount(page, '1 / 2');
    await closeCodeEditorSearchBar(page, EDITOR_ID);
    await setCodeEditorContent(page, EDITOR_ID, LARGE_DOC);
  });
});
