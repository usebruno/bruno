import { test, Page, Locator } from '../..';

export const buildCodeMirrorLocators = (page: Page) => ({
  hint: (name: string) => page.locator('.CodeMirror-hints:visible').getByRole('option', { name, exact: true }),
  byTestId: (testId: string) => page.getByTestId(testId).locator('.CodeMirror').first(),
  within: (scope: Locator) => scope.locator('.CodeMirror').first(),
  /** Nth row's value-column editor in an EditableTable (Headers / Params / Vars / Assertions). */
  valueCellAt: (scope: Locator, rowIndex: number = 0) =>
    scope.locator('table tbody tr').nth(rowIndex).getByTestId('column-value').locator('.CodeMirror'),
  /** Warning icon beside a sensitive input. `fieldName` is the field or variable name. */
  sensitiveWarning: (fieldName: string) => page.getByTestId(`sensitive-field-warning-${fieldName}`),
  sensitiveWarningIn: (root: Locator, fieldName: string) => root.getByTestId(`sensitive-field-warning-${fieldName}`),
  sensitiveTooltip: (text: string) => page.getByTestId('sensitive-field-tooltip').filter({ hasText: text })
});

const buildLocators = (page: Page) => ({
  codeMirror: buildCodeMirrorLocators(page)
});

/**
 * Clear and type into a CodeMirror editor identified by test ID
 * @param page - The page object
 * @param editorTestId - The test ID of the editor container
 * @param newContent - The content to type
 */
export const editCodeMirrorEditor = async (page: Page, editorTestId: string, newContent: string) => {
  await test.step(`Edit CodeMirror editor "${editorTestId}"`, async () => {
    const locators = buildLocators(page);
    const editor = locators.codeMirror.byTestId(editorTestId);
    await editor.waitFor({ state: 'visible' });
    const textarea = editor.locator('textarea[tabindex="0"]');
    await textarea.focus();
    const selectAll = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';
    await page.keyboard.press(selectAll);
    await page.keyboard.press('Backspace');
    await page.keyboard.type(newContent, { delay: 5 });
  });
};

/**
 * Replace a CodeMirror editor's content through the CodeMirror API instead of typing it.
 * Auto-close-bracket and auto-indent handling corrupts content typed character by character,
 * so anything holding `{{var}}` tokens or several lines of braces goes through here.
 * @param page - The page object
 * @param editorTestId - The test ID of the editor container
 * @param content - The content to write
 */
export const setCodeMirrorEditorValue = async (page: Page, editorTestId: string, content: string) => {
  await test.step(`Set CodeMirror editor "${editorTestId}"`, async () => {
    const editor = buildLocators(page).codeMirror.byTestId(editorTestId);
    await editor.waitFor({ state: 'visible' });
    await editor.evaluate((el, value) => {
      const cm = (el as any).CodeMirror;
      if (!cm) {
        throw new Error('CodeMirror instance not found');
      }
      cm.setValue(value);
    }, content);
  });
};

export const setCodeMirrorValue = async (cm: Locator, value: string) => {
  await cm.evaluate((el: any, v: string) => el.CodeMirror?.setValue(v), value);
};
