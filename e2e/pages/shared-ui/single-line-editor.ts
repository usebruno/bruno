import { expect, Page } from '../../playwright';
import { escapeRegExp } from '../../support/helpers';

/**
 * Inline single-line editors located by their field label (auth fields, proxy settings…).
 */

export const fieldEditor = (page: Page, labelText: string) =>
  page
    .locator('label')
    .filter({ hasText: new RegExp(`^${escapeRegExp(labelText)}$`) })
    .locator('xpath=following-sibling::*[contains(@class,"single-line-editor-wrapper")][1]')
    .locator('.CodeMirror');

/**
 * Type into a single-line CodeMirror editor identified by its sibling label.
 * @param page - The page object
 * @param labelText - Exact label text next to the editor
 * @param value - The text to type
 */
export const typeIntoField = async (page: Page, labelText: string, value: string) => {
  await fieldEditor(page, labelText).click();
  await page.keyboard.type(value);
};

/** Sets the field next to a label to this text. */
export const writeFieldValue = async (page: Page, labelText: string, value: string) => {
  const editor = fieldEditor(page, labelText).first();
  await editor.waitFor({ state: 'visible' });
  await editor.evaluate((el: any, nextValue: string) => {
    el.CodeMirror?.setValue(nextValue);
  }, value);
  await expect.poll(() => readField(page, labelText)).toBe(value);
};

/**
 * Read the current value of a single-line CodeMirror editor identified by its sibling label.
 * @param page - The page object
 * @param labelText - Exact label text next to the editor
 */
export const readField = async (page: Page, labelText: string): Promise<string> => {
  const editor = fieldEditor(page, labelText).first();
  await editor.waitFor({ state: 'visible' });
  return editor.evaluate((el: any) => (el as any).CodeMirror?.getValue() ?? '');
};
