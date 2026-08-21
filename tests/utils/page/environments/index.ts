import { expect, Page, test } from '../../../../playwright';
import { buildCollectionHeaderLocators } from '../collection/collection-header';

export type EnvironmentScope = 'collection' | 'global';

// The workspace-home "Environments" tab renders the same global-scoped editor as the
// standalone "Global Environments" tab, but keeps the collection tab's label.
const workspaceEnvTab = (page: Page) =>
  page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Environments' }) });

export const buildEnvironmentLocators = (page: Page) => ({
  selector: () => page.getByTestId('environment-selector-trigger'),
  collectionTab: () => page.getByTestId('env-tab-collection'),
  globalTab: () => page.getByTestId('env-tab-global'),
  envOption: (name: string) =>
    page.getByTestId('env-list-item').filter({ has: page.getByText(name, { exact: true }) }),
  listOption: (name: string) => page.locator('.environment-list .dropdown-item', { hasText: name }),
  listOptionBadge: (name: string) =>
    page
      .locator('.environment-list .dropdown-item')
      .filter({ has: page.getByText(name, { exact: true }) })
      .getByTestId('color-badge'),
  currentEnvironment: () => page.locator('.current-environment'),
  configureButton: () => page.locator('#configure-env'),
  saveButton: () => page.getByTestId('save-env'),
  varRow: (name: string) => page.getByTestId(`env-var-row-${name}`),
  // Prefix match — keep as a CSS selector since getByTestId is exact-match only.
  varRows: () => page.locator('tbody tr[data-testid^="env-var-row-"]'),
  // The Name column's input within a row found by its current name.
  varRowNameInput: (name: string) => page.getByTestId(`env-var-row-${name}`).locator('input[name$=".name"]'),
  // Name column's sort-cycle button (Variables tab only).
  sortToggle: () => page.getByTestId('column-sort-toggle'),
  // Present only when dragging is enabled for this row.
  dragHandle: (name: string) => page.getByTestId(`env-var-row-${name}`).getByTestId('drag-handle'),
  // Every visible row's Name input, in on-screen order.
  visibleNameInputs: () => page.locator('tbody tr[data-testid^="env-var-row-"]').locator('input[name$=".name"]'),
  // Rows for `name` whose CodeMirror value matches `value`. Useful when two rows
  // share a name (e.g. enabled + disabled twins after a script write).
  varRowsByValue: (name: string, value: string | RegExp) =>
    page.getByTestId(`env-var-row-${name}`)
      .filter({ has: page.getByTestId(/^test-multiline-editor-\d+\.value$/).locator('.CodeMirror-line', { hasText: value }) }),
  // Each env-var row has an `enabled` and a `secret` checkbox; target the latter
  // by its `<index>.secret` name (the formik index is dynamic).
  varRowSecretCheckbox: (name: string) => page.getByTestId(`env-var-row-${name}`).locator('input[name$=".secret"]'),
  // Eye icon that masks/reveals a secret variable's value.
  varRowEyeToggle: (name: string) => page.getByTestId(`env-var-row-${name}`).getByTestId('secret-reveal-toggle'),
  varRowValueCell: (name: string) => page.getByTestId(`env-var-row-${name}`).getByTestId(/^test-multiline-editor-\d+\.value$/),
  varRowValueEditor: (name: string) =>
    page.getByTestId(`env-var-row-${name}`).getByTestId(/^test-multiline-editor-\d+\.value$/).locator('.CodeMirror').first(),
  varRowValueLine: (name: string) =>
    page.getByTestId(`env-var-row-${name}`).getByTestId(/^test-multiline-editor-\d+\.value$/).locator('.CodeMirror-line').first(),
  varRowLine: (name: string) =>
    page.getByTestId(`env-var-row-${name}`).getByTestId(/^test-multiline-editor-\d+\.value$/).locator('.CodeMirror-line').first(),
  // Inline name-validation error icon(s) — within a named row, or across the whole editor.
  varRowError: (name: string) => page.getByTestId(`env-var-row-${name}`).getByTestId('env-var-name-error'),
  varErrors: () => page.getByTestId('env-var-name-error'),
  // The trailing empty "add new variable" row's name input.
  addRowNameInput: () => page.getByTestId('env-var-name-input').last(),
  addVariableButton: () => page.getByTestId('add-variable'),
  variableNameInput: (index: number) => page.locator(`input[name="${index}.name"]`),
  variableSecretCheckbox: (index: number) => page.locator(`input[name="${index}.secret"]`),
  variableRow: (index: number) => page.locator('tr').filter({ has: page.locator(`input[name="${index}.name"]`) }),
  variableDescriptionEditor: (index: number) =>
    page.locator(`[data-testid="test-multiline-editor-${index}.description"]`).locator('.CodeMirror'),
  varRowDescriptionEditor: (name: string) =>
    page.getByTestId(`env-var-row-${name}`).getByTestId(/^test-multiline-editor-\d+\.description$/).locator('.CodeMirror').first(),
  variableRowByName: (name: string) => page.locator('tbody tr').filter({ has: page.locator(`input[value="${name}"]`) }),
  // Targets the `.CodeMirror` wrapper (not `.CodeMirror-line`) so single-line and
  // multi-line values (e.g. formatted JSON for @object vars) are both covered —
  // CodeMirror renders each visual line as a separate `.CodeMirror-line`, so
  // matching on the wrapper is the only way to get the full concatenated text.
  variableValue: (name: string) =>
    page.locator('tbody tr').filter({ has: page.locator(`input[value="${name}"]`) }).getByTestId(/^test-multiline-editor-\d+\.value$/).locator('.CodeMirror').first(),
  createEnvButton: () => page.locator('button[id="create-env"]'),
  settingsCreateButton: () =>
    page.locator('.environments-container .sidebar button[title="Create environment"]'),
  settingsCreateNameInput: () => page.locator('.environment-item.creating .environment-name-input'),
  settingsCreateSaveButton: () => page.locator('.environment-item.creating .inline-action-btn.save'),
  createModal: () => page.locator('.bruno-modal').filter({ hasText: /Create( Global)? Environment/ }),
  createModalNameInput: () => page.locator('.bruno-modal #environment-name'),
  createModalCreateButton: () => page.locator('.bruno-modal').getByRole('button', { name: 'Create', exact: true }),
  envNameInput: () => page.locator('input[name="name"]'),
  // Variables and secrets each live on their own tab in the environment editor.
  variablesTab: () => page.getByTestId('responsive-tab-variables'),
  secretsTab: () => page.getByTestId('responsive-tab-secrets'),
  // Count badge on a tab ('variables' | 'secrets'); scoped to the visible tab so the hidden
  // measurement copy (which carries no responsive-tab testid) is excluded.
  tabCount: (tab: string) => page.getByTestId(`responsive-tab-${tab}`).getByTestId('env-tab-count'),
  saveTab: () => page.getByTestId('save-env'),
  saveAll: () => page.getByTestId('save-all-env'),
  searchInput: () => page.getByTestId('env-search-input'),
  searchClearBtn: () => page.locator('.env-list-search .close-icon'),
  listItem: (name?: string) => name ? page.getByTestId('env-list-item').filter({ hasText: name }) : page.getByTestId('env-list-item'),
  noResults: () => page.getByTestId('env-no-results'),
  noEnvironmentItem: () => page.getByTestId('env-no-environment-item'),
  searchAction: () => page.getByTestId('env-search-action'),
  savedToast: () => page.getByText('Changes saved successfully').last(),
  collectionEnvTab: () => page.locator('.request-tab').filter({ hasText: /^Environments$/ }),
  globalEnvTab: () => page.locator('.request-tab').filter({ hasText: /^Global Environments$/ }),
  unsavedModal: {
    closeWithoutSave: () => page.getByTestId('env-unsaved-close-without-save'),
    cancel: () => page.getByTestId('env-unsaved-cancel'),
    saveAndClose: () => page.getByTestId('env-unsaved-save-and-close')
  },
  importEmptyStateButton: () => page.getByTestId('empty-state-import-env-btn'),
  importModal: (scope: 'collection' | 'global') =>
    page.getByTestId(scope === 'global' ? 'import-global-environment-modal' : 'import-environment-modal'),
  importFileTrigger: (scope: 'collection' | 'global') =>
    page.getByTestId(scope === 'global' ? 'import-global-environment' : 'import-environment'),
  sidebarListItem: (scope: 'collection' | 'global', name: string) =>
    page
      .getByTestId(scope === 'global' ? 'workspace-env-list-item' : 'collection-env-list-item')
      .filter({ hasText: name }),
  varRowEnabledCheckbox: (name: string) =>
    page.getByTestId(`env-var-row-${name}`).getByTestId('env-var-enabled-checkbox'),
  resetButton: () => page.getByTestId('reset-env'),
  workspaceEnvTab: () => workspaceEnvTab(page),
  // The workspace Environments tab can't be closed, so unsaved changes surface as the
  // tab's draft icon instead of a close button.
  workspaceEnvTabDraftIcon: () => workspaceEnvTab(page).getByTestId('tab-draft-icon'),
  // The `.env` files section is shared by the collection and workspace environment editors.
  dotEnvSection: () => page.getByTestId('dotenv-files-section'),
  createDotEnvFileButton: () => page.getByTestId('create-dotenv-file'),
  dotEnvNameInput: () => page.getByTestId('dotenv-name-input'),
  dotEnvFileItem: (filename: string) => page.locator('.environment-item').filter({ hasText: filename }),
  dotEnvVarRow: (name: string) => page.getByTestId(`dotenv-var-row-${name}`),
  // The trailing empty "add new variable" row's name input.
  dotEnvAddRowNameInput: () => page.getByTestId('dotenv-var-name-input').last(),
  dotEnvVarValueEditor: (name: string) =>
    page.getByTestId(`dotenv-var-row-${name}`).getByTestId(/^test-multiline-editor-\d+\.value$/).locator('.CodeMirror').first(),
  saveDotEnvButton: () => page.getByTestId('save-dotenv'),
  resetDotEnvButton: () => page.getByTestId('reset-dotenv')
});

/**
 * Opens the environment selector dropdown
 * @param page - The page object
 * @returns void
 */
export const openEnvironmentSelector = async (page: Page) => {
  const trigger = buildCollectionHeaderLocators(page).envSelectorTrigger();
  const searchInput = buildEnvironmentLocators(page).searchInput();

  await test.step('Open dropdown', async () => {
    await trigger.waitFor({ state: 'visible' });
    await trigger.click();
    await searchInput.waitFor({ state: 'visible' });
  });
};

/**
 * Closes the environment selector dropdown if it is open, by clicking its trigger again.
 * @param page - The page object
 * @returns void
 */
export const closeEnvironmentSelector = async (page: Page) => {
  const trigger = buildCollectionHeaderLocators(page).envSelectorTrigger();
  await trigger.click();
};

/**
 * Deactivates the focused collection's environment via the dropdown's
 * "No Environment" entry.
 * @param page - The page object
 * @returns void
 */
export const selectNoEnvironment = async (page: Page) => {
  const environment = buildEnvironmentLocators(page);

  await test.step('Select "No Environment"', async () => {
    await environment.selector().click();
    await environment.noEnvironmentItem().click();
    await expect(environment.selector()).toContainText('No Environment');
  });
};

/**
 * Opens the workspace-level Environments tab, which edits global-scoped environments.
 * @param page - The page object
 */
export const openWorkspaceEnvironmentsTab = async (page: Page) => {
  await test.step('Open the workspace Environments tab', async () => {
    await buildEnvironmentLocators(page).workspaceEnvTab().click();
    await expect(page.locator('.request-tab.active').locator('.tab-label')).toHaveText('Environments');
  });
};

/**
 * Creates an environment from the environment editor's sidebar, using the inline
 * create row rather than the environment selector dropdown.
 * @param page - The page object
 * @param name - Environment name
 * @param scope - Environment scope the editor is showing
 */
export const createEnvironmentFromSidebar = async (
  page: Page,
  name: string,
  scope: EnvironmentScope = 'global'
) => {
  await test.step(`Create ${scope} environment "${name}"`, async () => {
    const environment = buildEnvironmentLocators(page);

    await environment.settingsCreateButton().click();
    const nameInput = environment.settingsCreateNameInput();
    await expect(nameInput).toBeVisible();
    await nameInput.fill(name);
    await nameInput.press('Enter');

    await expect(environment.sidebarListItem(scope, name)).toBeVisible();
  });
};

/**
 * Creates a `.env` file from the environment editor's `.env Files` section.
 * @param page - The page object
 * @param filename - Name of the file to create (must start with `.env`)
 */
export const createDotEnvFile = async (page: Page, filename = '.env') => {
  await test.step(`Create "${filename}" file`, async () => {
    const environment = buildEnvironmentLocators(page);

    await environment.dotEnvSection().click();
    await environment.createDotEnvFileButton().click();
    await environment.dotEnvNameInput().fill(filename);
    await environment.dotEnvNameInput().press('Enter');

    await expect(environment.dotEnvFileItem(filename)).toBeVisible();
  });
};

/**
 * Adds a variable to the `.env` file currently open in the environment editor.
 * @param page - The page object
 * @param name - Variable name
 * @param value - Variable value
 */
export const addDotEnvVariable = async (page: Page, name: string, value: string) => {
  await test.step(`Add "${name}" to the open .env file`, async () => {
    const environment = buildEnvironmentLocators(page);

    await environment.dotEnvAddRowNameInput().fill(name);
    await expect(environment.dotEnvVarRow(name)).toBeVisible();

    await environment.dotEnvVarValueEditor(name).click();
    await page.keyboard.type(value);
  });
};
