import { Page } from '../../../playwright';
import { selectScriptSubTab, type ScriptSubTab } from './actions';

export const buildCodeEditorHintLocators = (page: Page) => ({
  popup: () => page.locator('.CodeMirror-hints'),
  items: () => page.locator('.CodeMirror-hints .CodeMirror-hint')
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

export const readCodeEditorHints = async (page: Page): Promise<string[]> => {
  const items = buildCodeEditorHintLocators(page).items();
  await items.first().waitFor({ state: 'visible' });
  return (await items.allInnerTexts()).map((text) => text.trim());
};
