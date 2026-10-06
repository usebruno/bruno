import { Page } from '../../../playwright';
import { selectScriptSubTab, type ScriptSubTab } from './actions';

export const buildCodeEditorHintLocators = (page: Page) => ({
  popup: () => page.locator('.CodeMirror-hints'),
  items: () => page.locator('.CodeMirror-hints .CodeMirror-hint'),
  // A script API hint row: its name, then the member's summary.
  apiItem: (name: string) => page.locator('.CodeMirror-hints .CodeMirror-hint-api').filter({
    has: page.locator('.CodeMirror-hint-api-name', { hasText: name })
  }),
  apiItemSummary: (name: string) => buildCodeEditorHintLocators(page).apiItem(name).locator('.CodeMirror-hint-api-summary'),
  details: () => page.getByTestId('autocomplete-hint-details'),
  apiInfoTooltip: () => page.getByTestId('api-info-tooltip')
});

const codeMirror = (page: Page, subTab: ScriptSubTab) =>
  page.getByTestId(`${subTab}-script-editor`).locator('.CodeMirror').first();

export const focusScriptEditor = async (page: Page, subTab: ScriptSubTab) => {
  await selectScriptSubTab(page, subTab);
  const cm = codeMirror(page, subTab);
  await cm.waitFor({ state: 'visible' });
  await cm.evaluate((el: any) => {
    if (!el.CodeMirror) throw new Error('CodeMirror instance not attached to the script editor');
    el.CodeMirror.setValue('');
    el.CodeMirror.focus();
  });
};

export const readScriptEditorContent = async (page: Page, subTab: ScriptSubTab): Promise<string> =>
  codeMirror(page, subTab).evaluate((el: any) => {
    if (!el.CodeMirror) throw new Error('CodeMirror instance not attached to the script editor');
    return el.CodeMirror.getValue();
  });

export const dismissCodeEditorHints = async (page: Page) => {
  await page.keyboard.press('Escape');
  await buildCodeEditorHintLocators(page).popup().waitFor({ state: 'hidden' });
};

export const typeInScriptEditor = async (page: Page, subTab: ScriptSubTab, text: string) => {
  await codeMirror(page, subTab).click();
  await page.keyboard.type(text, { delay: 30 });
};

export const showRootScriptHints = async (page: Page, subTab: ScriptSubTab) => {
  await focusScriptEditor(page, subTab);
  await page.keyboard.press('Control+Space');
};

/** The hint texts, without the summaries script API rows show beside them. */
export const readCodeEditorHints = async (page: Page): Promise<string[]> => {
  const items = buildCodeEditorHintLocators(page).items();
  await items.first().waitFor({ state: 'visible' });
  return items.evaluateAll((rows) =>
    rows.map((row) => (row.querySelector('.CodeMirror-hint-api-name') ?? row).textContent?.trim() ?? '')
  );
};

export const setScriptEditorContent = async (page: Page, subTab: ScriptSubTab, text: string) => {
  await selectScriptSubTab(page, subTab);
  await codeMirror(page, subTab).evaluate((el: any, value: string) => {
    if (!el.CodeMirror) throw new Error('CodeMirror instance not attached to the script editor');
    el.CodeMirror.setValue(value);
  }, text);
};

/** Hovers the first token of the script editor whose text is exactly `token`. */
export const hoverScriptEditorToken = async (page: Page, subTab: ScriptSubTab, token: string) => {
  await codeMirror(page, subTab).locator('.CodeMirror-line span').filter({ hasText: new RegExp(`^${token}$`) }).first().hover();
};
