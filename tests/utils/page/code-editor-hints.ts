import { Page } from '../../../playwright';
import { selectScriptSubTab, type ScriptSubTab } from './actions';

/**
 * Locators for the CodeMirror autocomplete dropdown (the `show-hint` addon).
 * The popup is appended to document.body rather than the editor container, so it is
 * page-scoped — only one can be open at a time.
 */
export const buildCodeEditorHintLocators = (page: Page) => ({
  popup: () => page.locator('.CodeMirror-hints'),
  items: () => page.locator('.CodeMirror-hints .CodeMirror-hint'),
  item: (label: string) => page.locator('.CodeMirror-hints .CodeMirror-hint').filter({ hasText: label })
});

const editorTestId = (subTab: ScriptSubTab) => `${subTab}-script-editor`;

const codeMirror = (page: Page, subTab: ScriptSubTab) =>
  page.getByTestId(editorTestId(subTab)).locator('.CodeMirror').first();

/**
 * Open a Script sub-tab, clear its editor, and put the cursor in it ready for typing.
 */
export const focusScriptEditor = async (page: Page, subTab: ScriptSubTab) => {
  await selectScriptSubTab(page, subTab);
  const cm = codeMirror(page, subTab);
  await cm.waitFor({ state: 'visible' });
  await cm.evaluate((el: any) => {
    if (el.CodeMirror) {
      el.CodeMirror.setValue('');
      el.CodeMirror.focus();
    }
  });
};

/**
 * Dismiss an open hint popup so it cannot bleed into the next assertion. Both script
 * editors stay mounted (the inactive tab is only display:none), so a popup left open by
 * one sub-tab is still in the DOM after switching to the other.
 */
export const dismissCodeEditorHints = async (page: Page) => {
  await page.keyboard.press('Escape');
  await buildCodeEditorHintLocators(page).popup().waitFor({ state: 'hidden' });
};

/**
 * Type into the focused script editor, one character at a time, so each keystroke fires
 * the keyup the autocomplete listens on. `setValue` would bypass it entirely.
 */
export const typeInScriptEditor = async (page: Page, subTab: ScriptSubTab, text: string) => {
  await codeMirror(page, subTab).click();
  await page.keyboard.type(text, { delay: 30 });
};

/**
 * Request the root-level hints (bru / req / res) via the autocomplete keybinding. Only
 * fires on an empty cursor position, so the editor is cleared first.
 */
export const showRootScriptHints = async (page: Page, subTab: ScriptSubTab) => {
  await focusScriptEditor(page, subTab);
  await page.keyboard.press('Control+Space');
};

/**
 * Visible text of every entry in the open hint popup.
 */
export const readCodeEditorHints = async (page: Page): Promise<string[]> => {
  const items = buildCodeEditorHintLocators(page).items();
  await items.first().waitFor({ state: 'visible' });
  return (await items.allInnerTexts()).map((text) => text.trim());
};
