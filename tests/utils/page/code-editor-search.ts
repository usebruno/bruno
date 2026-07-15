import { Page } from '../../../playwright';
import { selectRequestPaneTab } from './actions';
import process from 'node:process';

const cmdKey = process.platform === 'darwin' ? 'Meta' : 'Control';

/**
 * Locators for the CodeMirrorSearch bar, scoped to a specific editor identified by testId.
 * Every locator is a function so Playwright re-evaluates the selector on each call,
 * keeping them resilient to React re-renders.
 */
export const buildCodeEditorSearchLocators = (page: Page, editorId: string) => {
  const scoped = (testId: string) => page.getByTestId(editorId).getByTestId(testId);
  return {
    editor: () => page.getByTestId(editorId),
    codeMirror: () => page.getByTestId(editorId).locator('.CodeMirror').first(),
    searchBar: () => scoped('codemirror-search-bar'),
    searchInput: () => scoped('codemirror-search-input'),
    replaceInput: () => scoped('codemirror-search-replace-input'),
    matchCount: () => scoped('codemirror-search-result-count'),
    searchRegexBtn: () => scoped('codemirror-search-regex-btn'),
    searchCaseBtn: () => scoped('codemirror-search-case-btn'),
    searchWholeWordBtn: () => scoped('codemirror-search-wholeword-btn'),
    searchPrevBtn: () => scoped('codemirror-search-prev-btn'),
    searchNextBtn: () => scoped('codemirror-search-next-btn'),
    searchCloseBtn: () => scoped('codemirror-search-close-btn'),
    replaceBtn: () => scoped('codemirror-search-replace-btn'),
    replaceAllBtn: () => scoped('codemirror-search-replaceall-btn')
  };
};

/**
 * Navigate to the Script > Pre Request tab and wait for the given editor to appear.
 */
export const openPreRequestScriptEditor = async (page: Page, editorId: string) => {
  await selectRequestPaneTab(page, 'Script');
  await page.getByTestId('tab-trigger-pre-request').click();
  await page.getByTestId(editorId).waitFor({ state: 'visible' });
};

/**
 * Replace the full CodeMirror editor content via the CM API (bypasses slow keyboard input).
 */
export const setCodeEditorContent = async (page: Page, editorId: string, content: string) => {
  const cm = page.getByTestId(editorId).locator('.CodeMirror').first();
  await cm.waitFor({ state: 'visible' });
  await cm.evaluate((el: any, val: string) => {
    if (el.CodeMirror) el.CodeMirror.setValue(val);
  }, content);
  await page.waitForTimeout(50);
};

/**
 * Deactivate any active search option toggles (case, regex, whole-word).
 * Call before opening the search bar in tests that care about a clean option state.
 */
export const resetCodeEditorSearchOptions = async (page: Page, editorId: string) => {
  const loc = buildCodeEditorSearchLocators(page, editorId);
  for (const btn of [loc.searchCaseBtn(), loc.searchRegexBtn(), loc.searchWholeWordBtn()]) {
    const cls = await btn.getAttribute('class');
    if (cls?.includes('active')) await btn.click();
  }
};

/**
 * Open the search bar via Cmd/Ctrl+F, reset all option toggles, and wait for the bar.
 */
export const openCodeEditorSearchBar = async (page: Page, editorId: string) => {
  await openPreRequestScriptEditor(page, editorId);
  const cm = page.getByTestId(editorId).locator('.CodeMirror').first();
  await cm.evaluate((el: any) => {
    if (el.CodeMirror) {
      el.CodeMirror.setCursor({ line: 0, ch: 0 });
      el.CodeMirror.focus();
    }
  });
  await page.keyboard.press(`${cmdKey}+f`);
  const loc = buildCodeEditorSearchLocators(page, editorId);
  await loc.searchBar().waitFor({ state: 'visible' });
  await resetCodeEditorSearchOptions(page, editorId);
};

/**
 * Open the replace bar via Ctrl+Alt+F and wait for both the search bar and replace input.
 *
 * Uses the keyboard shortcut rather than clicking toggle-replace-btn to avoid CI failures
 * where the sidebar can overlap the button.
 */
export const openCodeEditorReplaceBar = async (page: Page, editorId: string) => {
  await openPreRequestScriptEditor(page, editorId);
  const cm = page.getByTestId(editorId).locator('.CodeMirror').first();
  await cm.evaluate((el: any) => {
    if (el.CodeMirror) {
      el.CodeMirror.setCursor({ line: 0, ch: 0 });
      el.CodeMirror.focus();
    }
  });
  await page.keyboard.press('Control+Alt+f');
  const loc = buildCodeEditorSearchLocators(page, editorId);
  await loc.searchBar().waitFor({ state: 'visible' });
  await loc.replaceInput().waitFor({ state: 'visible' });
  await resetCodeEditorSearchOptions(page, editorId);
};

/**
 * Close the search bar via Escape and wait for it to be hidden.
 */
export const closeCodeEditorSearchBar = async (page: Page, editorId: string) => {
  await page.keyboard.press('Escape');
  const loc = buildCodeEditorSearchLocators(page, editorId);
  await loc.searchBar().waitFor({ state: 'hidden' });
};
