import { Page, Locator, expect } from '../../../playwright';

/**
 * Locators for variable-autocomplete dropdown (utils/codemirror/autocomplete.js).
 */
export const buildAutocompleteLocators = (page: Page) => {
  const widget = () => page.locator('.CodeMirror-hints');

  return {
    widget,
    items: () => widget().locator('.CodeMirror-hint'),
    variableItems: () => widget().locator('.CodeMirror-hint-variable'),
    activeItem: () => widget().locator('.CodeMirror-hint-active'),
    itemByName: (name: string) =>
      widget()
        .locator('.CodeMirror-hint-variable')
        .filter({ has: page.locator('.CodeMirror-hint-variable-name', { hasText: name }) })
  };
};

/**
 * Click into a CodeMirror-based field, type a single `{`, and assert the variable-autocomplete
 * dropdown opens with at least one variable hint.
 * @param page - The page object
 * @param editor - The `.CodeMirror` element for the field under test
 */
export const expectSingleBraceOpensAutocomplete = async (page: Page, editor: Locator) => {
  const { widget, variableItems } = buildAutocompleteLocators(page);
  await editor.click();
  await page.keyboard.press('End');
  await page.keyboard.type('{');
  await expect(widget()).toBeVisible();
  await expect(variableItems().first()).toBeVisible();
};

/**
 * Click into a CodeMirror-based field, type a single `{`, and assert no autocomplete dropdown
 * appears.
 * @param page - The page object
 * @param editor - The `.CodeMirror` element for the field under test
 */
export const expectSingleBraceDoesNotOpenAutocomplete = async (page: Page, editor: Locator) => {
  const { widget } = buildAutocompleteLocators(page);
  await editor.click();
  await page.keyboard.press('End');
  await page.keyboard.type('{');
  await page.waitForTimeout(300);
  await expect(widget()).toHaveCount(0);
};

/**
 * "Trigger Autocomplete" shortcut (Ctrl+Space)
 * @param page - The page object
 */
export const pressAutocompleteShortcut = async (page: Page) => {
  await page.keyboard.down('Control');
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  await page.keyboard.up('Control');
};

/**
 * Read a CodeMirror field's current document text via its own API, not its rendered DOM text
 * as masked fields (isSecret) render `*` but still hold the real value here.
 * @param editor - The `.CodeMirror` element for the field under test
 */
export const readEditorValue = async (editor: Locator): Promise<string> =>
  editor.evaluate((el: any) => el.CodeMirror?.getValue() ?? '');

/**
 * Set a CodeMirror field's document text and cursor position directly via its own API
 * @param editor - The `.CodeMirror` element for the field under test
 * @param value - The full document text to set
 * @param cursorCh - The cursor's character offset on line 0 (single-line fields only)
 */
export const setEditorState = async (editor: Locator, value: string, cursorCh: number) => {
  await editor.evaluate(
    (el: any, { value, cursorCh }: { value: string; cursorCh: number }) => {
      const cm = el.CodeMirror;
      cm.setValue(value);
      cm.setCursor({ line: 0, ch: cursorCh });
      cm.focus();
    },
    { value, cursorCh }
  );
};

/**
 * Click a variable hint in the open autocomplete dropdown by its (unique-enough) name, picking it
 * the same way a real user's mouse click would.
 * @param page - The page object
 * @param name - Text uniquely identifying the hint's displayed name (substring match)
 */
export const pickHint = async (page: Page, name: string) => {
  const { itemByName } = buildAutocompleteLocators(page);
  await itemByName(name).first().click();
};
