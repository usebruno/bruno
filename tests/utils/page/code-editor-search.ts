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
 * Open the replace bar and wait for both the search bar and replace input.
 *
 * Shortcut: Cmd+Option+F (Mac) / Ctrl+H (Win/Linux).
 * Uses the keyboard shortcut rather than clicking toggle-replace-btn to avoid CI failures
 * where the sidebar can overlap the button.
 */
export const openCodeEditorReplaceBar = async (page: Page, editorId: string) => {
  const replaceKey = process.platform === 'darwin' ? 'Meta+Alt+f' : 'Control+h';
  await openPreRequestScriptEditor(page, editorId);
  const cm = page.getByTestId(editorId).locator('.CodeMirror').first();
  await cm.evaluate((el: any) => {
    if (el.CodeMirror) {
      el.CodeMirror.setCursor({ line: 0, ch: 0 });
      el.CodeMirror.focus();
    }
  });
  await page.keyboard.press(replaceKey);
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

/**
 * Set the cursor position in the editor. Pass `focus: true` to also focus the editor
 * so that a subsequent Cmd+F picks up the cursor position.
 */
export const setCodeEditorCursor = async (
  page: Page,
  editorId: string,
  pos: { line: number; ch: number },
  focus = false
) => {
  const cm = page.getByTestId(editorId).locator('.CodeMirror').first();
  await cm.evaluate(
    (el: any, { pos, focus }: { pos: { line: number; ch: number }; focus: boolean }) => {
      if (el.CodeMirror) {
        el.CodeMirror.setCursor(pos);
        if (focus) el.CodeMirror.focus();
      }
    },
    { pos, focus }
  );
};

/** Click a document position using real mouse input, rather than setting the cursor directly. */
export const clickCodeEditorPosition = async (
  page: Page,
  editorId: string,
  pos: { line: number; ch: number }
) => {
  const cm = buildCodeEditorSearchLocators(page, editorId).codeMirror();
  const point = await cm.evaluate((el: any, position) => {
    const coords = el.CodeMirror.charCoords(position, 'window');
    return { x: coords.left, y: (coords.top + coords.bottom) / 2 };
  }, pos);
  await page.mouse.click(point.x, point.y);
};

/** Read content and both selection endpoints so tests can detect a cursor jump or selected match. */
export const getCodeEditorState = async (page: Page, editorId: string) => {
  return buildCodeEditorSearchLocators(page, editorId).codeMirror().evaluate((el: any) => {
    const anchor = el.CodeMirror.getCursor('anchor');
    const head = el.CodeMirror.getCursor('head');
    return {
      content: el.CodeMirror.getValue() as string,
      anchor: { line: anchor.line as number, ch: anchor.ch as number },
      head: { line: head.line as number, ch: head.ch as number }
    };
  });
};

/**
 * Set a text selection in the editor and focus it so that Cmd+F pre-fills with the selected text.
 */
export const setCodeEditorSelection = async (
  page: Page,
  editorId: string,
  from: { line: number; ch: number },
  to: { line: number; ch: number }
) => {
  const cm = page.getByTestId(editorId).locator('.CodeMirror').first();
  await cm.evaluate(
    (el: any, { from, to }: { from: { line: number; ch: number }; to: { line: number; ch: number } }) => {
      if (el.CodeMirror) {
        el.CodeMirror.setSelection(from, to);
        el.CodeMirror.focus();
      }
    },
    { from, to }
  );
};

/**
 * Focus the editor without changing the cursor, selection, or scroll position.
 *
 * Closing the search bar unmounts its input and temporarily leaves the editor
 * unfocused. Refocus it before the next keyboard action. Using preventScroll
 * avoids scrolling the cursor into view.
 */
export const focusCodeEditor = async (page: Page, editorId: string) => {
  const cm = page.getByTestId(editorId).locator('.CodeMirror').first();

  await cm.evaluate((el: any) => {
    const instance = el.CodeMirror;
    if (!instance) return;

    const input = instance.getInputField?.();
    if (input?.focus) {
      input.focus({ preventScroll: true });
    } else {
      instance.focus();
    }
  });
};

/**
 * Scroll the editor so that the given line is visible.
 */
export const scrollCodeEditorToLine = async (page: Page, editorId: string, line: number) => {
  const cm = page.getByTestId(editorId).locator('.CodeMirror').first();
  await cm.evaluate((el: any, line: number) => {
    if (el.CodeMirror) {
      el.CodeMirror.scrollTo(null, el.CodeMirror.heightAtLine(line, 'local'));
    }
  }, line);
};

/**
 * Returns the current vertical scroll position (px) of the editor.
 */
export const getCodeEditorScrollTop = async (page: Page, editorId: string): Promise<number> => {
  const cm = page.getByTestId(editorId).locator('.CodeMirror').first();
  return cm.evaluate((el: any) => el.CodeMirror?.getScrollInfo().top ?? 0);
};

/**
 * Append text at the end of the last line of the editor (simulates an inline edit).
 */
export const appendTextToCodeEditor = async (page: Page, editorId: string, text: string) => {
  const cm = page.getByTestId(editorId).locator('.CodeMirror').first();
  await cm.evaluate((el: any, text: string) => {
    if (el.CodeMirror) {
      const lastLine = el.CodeMirror.lastLine();
      const lastCh = el.CodeMirror.getLine(lastLine).length;
      el.CodeMirror.replaceRange(text, { line: lastLine, ch: lastCh });
    }
  }, text);
};

export const getCodeEditorValueAndCursor = async (page: Page, editorId: string) => {
  const cm = buildCodeEditorSearchLocators(page, editorId).codeMirror();
  return cm.evaluate((el: any) => {
    const { line, ch } = el.CodeMirror.getCursor();
    return { value: el.CodeMirror.getValue(), cursor: { line, ch }, hasSelection: el.CodeMirror.somethingSelected() };
  });
};

export const replaceMatchThenTypeBeforeSearchRefresh = async (
  page: Page,
  editorId: string,
  pos: { line: number; ch: number },
  text: string
) => {
  const searchBar = buildCodeEditorSearchLocators(page, editorId);
  const replaceButton = await searchBar.replaceBtn().elementHandle();
  await searchBar.codeMirror().evaluate(
    (el: any, { replaceButton, pos, text }: { replaceButton: any; pos: { line: number; ch: number }; text: string }) => {
      replaceButton.click();
      el.CodeMirror.setCursor(pos);
      el.CodeMirror.replaceSelection(text);
    },
    { replaceButton, pos, text }
  );
};

export const replaceMatchThenCloseSearchBarBeforeRefresh = async (page: Page, editorId: string) => {
  const searchBar = buildCodeEditorSearchLocators(page, editorId);
  const closeButton = await searchBar.searchCloseBtn().elementHandle();
  await searchBar.replaceBtn().evaluate((replaceButton: HTMLElement, closeButton: any) => {
    replaceButton.click();
    closeButton.click();
  }, closeButton);
  await searchBar.searchBar().waitFor({ state: 'hidden' });
};
