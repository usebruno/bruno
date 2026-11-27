import { Page } from '../../playwright';
import { selectScriptSubTab, type ScriptSubTab } from '../request/script';
import { selectCollectionPaneTab } from '../collection/settings';
import { buildPaneTabsLocators } from './pane-tabs';
import { escapeRegExp } from '../../utils/helpers';

export type HintEditor = ScriptSubTab | 'collection-tests';

export const buildCodeEditorHintLocators = (page: Page) => ({
  popup: () => page.locator('.CodeMirror-hints'),
  items: () => page.locator('.CodeMirror-hints .CodeMirror-hint'),
  apiItem: (name: string) => page.getByTestId('autocomplete-api-item').filter({
    has: page.getByTestId('autocomplete-api-name').filter({ hasText: name })
  }),
  apiItemSummary: (name: string) => buildCodeEditorHintLocators(page).apiItem(name).getByTestId('autocomplete-api-summary'),
  details: () => page.getByTestId('autocomplete-hint-details'),
  apiInfoTooltip: () => page.getByTestId('api-info-tooltip')
});

const codeMirror = (page: Page, editor: HintEditor) =>
  (editor === 'collection-tests'
    ? buildPaneTabsLocators(page).collectionSettingsContent()
    : page.getByTestId(`${editor}-script-editor`)
  ).locator('.CodeMirror').first();

const selectEditor = async (page: Page, editor: HintEditor) => {
  if (editor === 'collection-tests') {
    await selectCollectionPaneTab(page, 'tests');
  } else {
    await selectScriptSubTab(page, editor);
  }
};

export const focusScriptEditor = async (page: Page, editor: HintEditor) => {
  await selectEditor(page, editor);
  const cm = codeMirror(page, editor);
  await cm.waitFor({ state: 'visible' });
  await cm.evaluate((el: any) => {
    if (!el.CodeMirror) throw new Error('CodeMirror instance not attached to the script editor');
    el.CodeMirror.setValue('');
    el.CodeMirror.focus();
  });
};

export const readScriptEditorContent = async (page: Page, editor: HintEditor): Promise<string> =>
  codeMirror(page, editor).evaluate((el: any) => {
    if (!el.CodeMirror) throw new Error('CodeMirror instance not attached to the script editor');
    return el.CodeMirror.getValue();
  });

export const dismissCodeEditorHints = async (page: Page) => {
  await page.keyboard.press('Escape');
  await buildCodeEditorHintLocators(page).popup().waitFor({ state: 'hidden' });
};

export const typeInScriptEditor = async (page: Page, editor: HintEditor, text: string) => {
  await codeMirror(page, editor).click();
  await page.keyboard.type(text, { delay: 30 });
};

export const showRootScriptHints = async (page: Page, editor: HintEditor) => {
  await focusScriptEditor(page, editor);
  await page.keyboard.press('Control+Space');
};

export const readCodeEditorHints = async (page: Page): Promise<string[]> => {
  const items = buildCodeEditorHintLocators(page).items();
  await items.first().waitFor({ state: 'visible' });
  return items.evaluateAll((rows) =>
    rows.map((row) => (row.querySelector('[data-testid="autocomplete-api-name"]') ?? row).textContent?.trim() ?? '')
  );
};

export const hoverScriptEditorToken = async (page: Page, editor: HintEditor, token: string) => {
  await codeMirror(page, editor).locator('.CodeMirror-line span').filter({ hasText: new RegExp(`^${escapeRegExp(token)}$`) }).first().hover();
};
