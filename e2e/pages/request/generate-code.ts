import { test, expect, Page } from '../../playwright';
import { selectRequestPaneTab, buildRequestLocators } from './pane';
import { buildModalLocators } from '../shared-ui/modal';
import { readEditorValue } from '../shared-ui/autocomplete';

/**
 * Locators for the Generate Code dialog.
 * @param page - The page object
 */
const buildGenerateCodeLocators = (page: Page) => ({
  dialog: () => page.getByRole('dialog'),
  codeEditor: () => page.getByRole('dialog').locator('.editor-content .CodeMirror').first(),
  copyButton: () => page.getByRole('dialog').getByRole('button', { name: 'Copy to clipboard' }),
  interpolateToggle: () => page.getByTestId('interpolate-vars-toggle')
});

const buildLocators = (page: Page) => ({
  request: buildRequestLocators(page),
  modal: buildModalLocators(page),
  generateCode: buildGenerateCodeLocators(page)
});

/**
 * Read the snippet from an already-open Generate Code dialog
 * (without re-opening it). Use after toggling a setting inside the dialog.
 * @param page - The page object
 * @returns The full text of the generated code snippet
 */
const readGeneratedSnippet = async (page: Page): Promise<string> => {
  return await test.step('Read generated snippet', async () => {
    const codeEditor = buildGenerateCodeLocators(page).codeEditor();
    await expect(codeEditor).toBeVisible();
    await page.waitForFunction(() =>
      Boolean((document.querySelector('.editor-content .CodeMirror') as any)?.CodeMirror?.getValue())
    );
    return await readEditorValue(codeEditor);
  });
};

/**
 * Open the Generate Code dialog and return the generated snippet.
 * @param page - The page object
 * @returns The full text of the generated code snippet
 */
const getGeneratedSnippet = async (page: Page): Promise<string> => {
  return await test.step('Open Generate Code dialog and read snippet', async () => {
    const { request, generateCode } = buildLocators(page);

    await request.generateCodeButton().click();
    await expect(generateCode.dialog()).toBeVisible();

    return await readGeneratedSnippet(page);
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
    const toggle = buildGenerateCodeLocators(page).interpolateToggle();
    await expect(toggle).toBeVisible();
    if ((await toggle.isChecked()) !== enabled) {
      await toggle.setChecked(enabled);
      await expect(toggle).toBeChecked({ checked: enabled });
    }
  });
};

/**
 * Close the Generate Code dialog and wait for it to disappear. A no-op when no
 * dialog is open, so it is safe to call from `afterEach` cleanup.
 * @param page - The page object
 * @returns void
 */
const closeGenerateCodeDialog = async (page: Page) => {
  await test.step('Close Generate Code dialog', async () => {
    const { modal } = buildLocators(page);
    if (!(await modal.closeButton().isVisible())) {
      return;
    }
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

export { buildGenerateCodeLocators, getGeneratedSnippet, readGeneratedSnippet, setInterpolateVariables, closeGenerateCodeDialog, setUrlEncoding };
