import { expect, Page, Locator } from '../../playwright';
import { buildEnvironmentLocators } from '../environment/environment';
import { buildRequestLocators } from '../request/pane';

const addToNoEnvNoteLocator = (popup: Locator, scopeType: 'environment' | 'global') =>
  popup.getByTestId('var-info-add-to-no-env-note')
    .filter({ hasText: scopeType === 'global' ? 'Global Environment' : 'Collection Environment' });

/**
 * Locators for the variable info popup shown when hovering a `{{var}}` token.
 */
export const buildVarInfoPopupLocators = (page: Page) => ({
  all: () => page.getByTestId('var-info-popup'),
  byName: (name: string) =>
    page.getByTestId('var-info-popup').filter({ has: page.getByTestId('var-info-name').filter({ hasText: new RegExp(`^${name}$`) }) }),
  name: (popup: Locator) => popup.getByTestId('var-info-name'),
  scopeBadge: (popup: Locator) => popup.getByTestId('var-info-scope-badge'),
  valueDisplay: (popup: Locator) => popup.getByTestId(/^var-info-value-(editable|display)$/).first(),
  editableValue: (popup: Locator) => popup.getByTestId('var-info-value-editable').first(),
  secretToggle: (popup: Locator) => popup.getByTestId('var-info-secret-toggle'),
  copyButton: (popup: Locator) => popup.getByTestId('var-info-copy-button'),
  readonlyNote: (popup: Locator) => popup.getByTestId('var-info-readonly-note'),
  warningNote: (popup: Locator) => popup.getByTestId('var-info-warning-note'),
  // The editor container itself (hidden until the value display is clicked).
  editorContainer: (popup: Locator) => popup.getByTestId('var-info-value-editor'),
  editor: (popup: Locator) => popup.getByTestId('var-info-value-editor').locator('.CodeMirror'),
  // The "Add to" switcher, shown in place of an editable value for undefined variables.
  addToSwitcher: (popup: Locator) => popup.getByTestId('var-info-add-to'),
  addToToggle: (popup: Locator) => popup.getByTestId('var-info-add-to-toggle'),
  addToList: (popup: Locator) => popup.getByTestId('var-info-add-to-list'),
  addToOption: (popup: Locator, scopeType: string) => popup.getByTestId(`var-info-add-to-option-${scopeType}`),
  addToActiveOption: (popup: Locator, scopeType?: string) => {
    const activeRow = popup.locator('.var-add-to-option-active');
    return scopeType ? activeRow.getByTestId(`var-info-add-to-option-${scopeType}`) : activeRow;
  },
  addToSecretCheckbox: (popup: Locator) => popup.getByTestId('var-info-add-to-secret-checkbox'),
  addToNoEnvNote: (popup: Locator, scopeType: 'environment' | 'global') => addToNoEnvNoteLocator(popup, scopeType),
  addToCreateEnvButton: (popup: Locator, scopeType: 'environment' | 'global') =>
    addToNoEnvNoteLocator(popup, scopeType)
      .locator('xpath=..')
      .getByTestId('var-info-add-to-create-env-button'),
  addToCreateEnvNameInput: (popup: Locator) => popup.getByTestId('var-info-add-to-create-env-name-input'),
  addToCreateEnvSubmit: (popup: Locator) => popup.getByTestId('var-info-add-to-create-env-submit'),
  addToError: (popup: Locator) => popup.getByTestId('var-info-add-to-error')
});

const buildLocators = (page: Page) => ({
  environment: buildEnvironmentLocators(page),
  request: buildRequestLocators(page),
  varInfoPopup: buildVarInfoPopupLocators(page)
});

/**
 * @param page - The page object
 */
export const dismissVarTooltip = async (page: Page) => {
  await page.locator('body').click();
};

/**
 * Hover a `{{var}}` token in the URL editor and return its (visible) info tooltip.
 * @param page - The page object
 * @param varName - The variable name inside the braces
 * @param state - Highlight class to match: 'valid' (known) or 'invalid' (unknown); omit to match either
 * @returns The tooltip popup locator
 */
export const openUrlVarTooltip = async (
  page: Page,
  varName: string,
  state?: 'valid' | 'invalid'
): Promise<Locator> => {
  const { request, varInfoPopup } = buildLocators(page);
  // Dismiss any previously-open tooltip first.
  await page.mouse.move(0, 0);
  await request.urlVariableToken(varName, state).hover();

  const tooltip = varInfoPopup.all().first();
  await expect(tooltip).toBeVisible();
  return tooltip;
};

/**
 * Hover a `{{var}}` token inside another row's Value cell in the (collection or global)
 * environment table itself, and return its (visible) info tooltip. Use this for the
 * "go to definition from inside the environment table it would target" scenario, as opposed
 * to `openUrlVarTooltip` which hovers a token in a request's URL bar.
 * @param page - The page object
 * @param rowName - The name of the environment row whose Value cell contains the token
 * @param tokenName - The variable name inside the braces to hover
 * @param state - Highlight class to match: 'valid' (known) or 'invalid' (unknown); omit to match either
 * @returns The tooltip popup locator
 */
export const openEnvValueVarTooltip = async (
  page: Page,
  rowName: string,
  tokenName: string,
  state?: 'valid' | 'invalid'
): Promise<Locator> => {
  const { environment, varInfoPopup } = buildLocators(page);
  const selector = state ? `.cm-variable-${state}` : '.cm-variable-valid, .cm-variable-invalid';
  // Dismiss any previously-open tooltip first.
  await page.mouse.move(0, 0);
  await environment.varRowValueEditor(rowName).locator(selector).filter({ hasText: tokenName }).first().hover();

  const tooltip = varInfoPopup.all().first();
  await expect(tooltip).toBeVisible();
  return tooltip;
};
