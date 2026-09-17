import { Page, Locator, expect } from '../../../playwright';

/**
 * Locators for Bruno's variable-autocomplete dropdown (utils/codemirror/autocomplete.js).
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
