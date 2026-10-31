import { expect, Page, Locator } from '../..';
import { buildRequestLocators } from './pane';

/**
 * Type a header name into an EditableTable Name cell (CodeMirror).
 */
export const fillRequestHeaderName = async (page: Page, row: Locator, name: string) => {
  const nameEditor = row.getByTestId('column-name').locator('.CodeMirror');
  await nameEditor.click();
  await page.keyboard.type(name);
};

/**
 * Type a header value into an EditableTable Value cell (CodeMirror).
 */
export const fillRequestHeaderValue = async (page: Page, row: Locator, value: string) => {
  const valueEditor = row.getByTestId('column-value').locator('.CodeMirror');
  await valueEditor.click();
  await page.keyboard.type(value);
};

/**
 * Reveal the Inherited Headers accordion (hidden by default) and return header locators.
 */
export const showInheritedHeaders = async (page: Page) => {
  const { headers } = buildRequestLocators(page);
  await headers.toggleInherited().click();
  await expect(headers.toggleInherited()).toHaveText('Hide Additional Headers');
  return headers;
};
