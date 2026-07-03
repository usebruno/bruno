import { test, expect, Page } from '../../../../playwright';
import { buildCommonLocators } from '../locators';
import { selectRequestPaneTab } from '../actions';

/**
 * Open the Generate Code dialog and return the visible snippet text.
 * @param page - The page object
 * @returns The text content of the generated code snippet
 */
const getGeneratedSnippet = async (page: Page): Promise<string> => {
  return await test.step('Open Generate Code dialog and read snippet', async () => {
    const { request } = buildCommonLocators(page);

    await request.generateCodeButton().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const codeEditor = page.locator('.editor-content .CodeMirror').first();
    await expect(codeEditor).toBeVisible();

    return (await codeEditor.textContent()) ?? '';
  });
};

/**
 * Read the currently-rendered snippet from an already-open Generate Code dialog
 * (without re-opening it). Use after toggling a setting inside the dialog.
 * @param page - The page object
 * @returns The text content of the generated code snippet
 */
const readGeneratedSnippet = async (page: Page): Promise<string> => {
  return await test.step('Read generated snippet', async () => {
    const codeEditor = page.locator('.editor-content .CodeMirror').first();
    await expect(codeEditor).toBeVisible();
    return (await codeEditor.textContent()) ?? '';
  });
};

/**
 * Toggle the "Interpolate Variables" checkbox in the open Generate Code dialog.
 * The dialog must already be open.
 * @param page - The page object
 * @param enabled - Whether variable interpolation should be enabled
 * @returns void
 */
const setInterpolateVariables = async (page: Page, enabled: boolean) => {
  await test.step(`Set Interpolate Variables ${enabled ? 'ON' : 'OFF'}`, async () => {
    const toggle = page.getByTestId('interpolate-vars-toggle');
    await expect(toggle).toBeVisible();
    if ((await toggle.isChecked()) !== enabled) {
      await toggle.setChecked(enabled);
      await expect(toggle).toBeChecked({ checked: enabled });
    }
  });
};

/**
 * Close the Generate Code dialog and wait for it to disappear.
 * @param page - The page object
 * @returns void
 */
const closeGenerateCodeDialog = async (page: Page) => {
  await test.step('Close Generate Code dialog', async () => {
    const { modal } = buildCommonLocators(page);
    await modal.closeButton().click();
    await modal.closeButton().waitFor({ state: 'hidden' });
  });
};

/**
 * Toggle the URL encoding setting on the current request.
 * @param page - The page object
 * @param enabled - Whether URL encoding should be enabled
 * @returns void
 */
const setUrlEncoding = async (page: Page, enabled: boolean) => {
  await test.step(`Set URL encoding ${enabled ? 'ON' : 'OFF'}`, async () => {
    await selectRequestPaneTab(page, 'Settings');
    const toggle = page.getByTestId('encode-url-toggle');
    await expect(toggle).toBeVisible();
    const current = (await toggle.getAttribute('aria-checked')) === 'true';
    if (current !== enabled) {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', String(enabled));
    }
  });
};

export { getGeneratedSnippet, readGeneratedSnippet, setInterpolateVariables, closeGenerateCodeDialog, setUrlEncoding };
