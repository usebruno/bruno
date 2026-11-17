import { Page, test } from '../../../playwright';
import { selectRequestPaneTab, selectScriptSubTab, type ScriptSubTab } from './actions';
import { buildCommonLocators } from './locators';

/**
 * Append a blank line at the end of a Script sub-tab editor, or of the request's Tests editor
 * @param page - The page object
 * @param subTab - The Script sub-tab to edit, or 'tests' for the Tests pane tab
 */
export const appendBlankLineToScript = async (page: Page, subTab: ScriptSubTab | 'tests') => {
  await test.step(`Append a blank line to the ${subTab} script`, async () => {
    if (subTab === 'tests') {
      await selectRequestPaneTab(page, 'Tests');
    } else {
      await selectScriptSubTab(page, subTab);
    }
    const editorTestId = subTab === 'tests' ? 'test-script-editor' : `${subTab}-script-editor`;
    const editor = buildCommonLocators(page).codeMirror.byTestId(editorTestId);
    await editor.waitFor({ state: 'visible' });
    await editor.evaluate((el: any) => {
      const cm = el.CodeMirror;
      cm.focus();
      const lastLine = cm.lastLine();
      cm.setCursor({ line: lastLine, ch: cm.getLine(lastLine).length });
    });
    await page.keyboard.press('Enter');
  });
};
