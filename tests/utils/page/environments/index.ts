import { expect, Page, test } from '../../../../playwright';
import { buildCollectionHeaderLocators } from '../collection/collection-header';

export type EnvironmentScope = 'collection' | 'global';

// The workspace-home "Environments" tab renders the same global-scoped editor as the
// standalone "Global Environments" tab and shares its label, so both are located by
// the tab type carried in their testid rather than by text.
const workspaceEnvTab = (page: Page) => page.getByTestId('request-tab-workspaceEnvironments');

// Create Environment (collection) and Create Global Environment are separate modals.
const createEnvModal = (page: Page) =>
  page.getByTestId('create-environment-modal').or(page.getByTestId('create-global-environment-modal'));

// A variables row keyed by its name. The environment editor names its rows
// `env-var-row-<name>`; the collection Vars tables use the shared editable-table
// naming (`row-<name>`), so they're scoped to those tables to stay unambiguous.
const varRowByName = (page: Page, name: string) =>
  page
    .getByTestId(`env-var-row-${name}`)
    .or(page.getByTestId(/^collection-vars-(req|res)$/).getByTestId(`row-${name}`));

// CodeMirror builds its own DOM inside the editor's testid wrapper, so its classes are
// the only handle on a cell's value — everything else here is located by testid.
export const buildEnvironmentLocators = (page: Page) => ({
  selector: () => page.getByTestId('environment-selector-trigger'),
  collectionTab: () => page.getByTestId('env-tab-collection'),
  globalTab: () => page.getByTestId('env-tab-global'),
  envOption: (name: string) =>
    page.getByTestId('env-list-item').filter({ has: page.getByText(name, { exact: true }) }),
  listOption: (name: string) => page.getByTestId('env-list-item').filter({ hasText: name }),
  listOptionBadge: (name: string) =>
    page
      .getByTestId('env-list-item')
      .filter({ has: page.getByText(name, { exact: true }) })
      .getByTestId('color-badge'),
  currentEnvironment: () => page.getByTestId('environment-selector-trigger'),
  configureButton: () => page.getByTestId('configure-env'),
  saveButton: () => page.getByTestId('save-env'),
  varRow: (name: string) => page.getByTestId(`env-var-row-${name}`),
  // Every row's testid carries its variable name, so the prefix matches them all.
  varRows: () => page.getByTestId(/^env-var-row-/),
  // The Name column's input within a row found by its current name.
  varRowNameInput: (name: string) => page.getByTestId(`env-var-row-${name}`).getByTestId('env-var-name-input'),
  // Name column's sort-cycle button (Variables tab only).
  sortToggle: () => page.getByTestId('column-sort-toggle'),
  // Present only when dragging is enabled for this row.
  dragHandle: (name: string) => page.getByTestId(`env-var-row-${name}`).getByTestId('drag-handle'),
  // Every visible row's Name input, in on-screen order.
  visibleNameInputs: () => page.getByTestId(/^env-var-row-/).getByTestId('env-var-name-input'),
  // Rows for `name` whose CodeMirror value matches `value`. Useful when two rows
  // share a name (e.g. enabled + disabled twins after a script write).
  varRowsByValue: (name: string, value: string | RegExp) =>
    page.getByTestId(`env-var-row-${name}`)
      .filter({ has: page.getByTestId(/^test-multiline-editor-\d+\.value$/).locator('.CodeMirror-line', { hasText: value }) }),
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
  // The Name column's input in the row at a given formik index (its cell carries the index).
  variableNameInput: (index: number) => page.getByTestId(`env-var-name-cell-${index}`).getByTestId('env-var-name-input'),
  variableDescriptionEditor: (index: number) =>
    page.getByTestId(`test-multiline-editor-${index}.description`).locator('.CodeMirror'),
  varRowDescriptionEditor: (name: string) =>
    page.getByTestId(`env-var-row-${name}`).getByTestId(/^test-multiline-editor-\d+\.description$/).locator('.CodeMirror').first(),
  variableRowByName: (name: string) => varRowByName(page, name),
  // Targets the `.CodeMirror` wrapper (not `.CodeMirror-line`) so single-line and
  // multi-line values (e.g. formatted JSON for @object vars) are both covered —
  // CodeMirror renders each visual line as a separate `.CodeMirror-line`, so
  // matching on the wrapper is the only way to get the full concatenated text.
  variableValue: (name: string) =>
    varRowByName(page, name).getByTestId(/^test-multiline-editor-\d+\.value$/).locator('.CodeMirror').first(),
  createEnvButton: () => page.getByTestId('create-env'),
  settingsCreateButton: () => page.getByTestId('create-environment'),
  settingsCreateNameInput: () => page.getByTestId('env-create-name-input'),
  settingsCreateSaveButton: () => page.getByTestId('env-create-save'),
  createModal: () => createEnvModal(page),
  createModalNameInput: () => page.getByTestId('environment-name-input'),
  createModalCreateButton: () => createEnvModal(page).getByRole('button', { name: 'Create', exact: true }),
  envNameInput: () => page.getByTestId('environment-name-input'),
  // Variables and secrets each live on their own tab in the environment editor.
  variablesTab: () => page.getByTestId('responsive-tab-variables'),
  secretsTab: () => page.getByTestId('responsive-tab-secrets'),
  // Count badge on a tab ('variables' | 'secrets'); scoped to the visible tab so the hidden
  // measurement copy (which carries no responsive-tab testid) is excluded.
  tabCount: (tab: string) => page.getByTestId(`responsive-tab-${tab}`).getByTestId('env-tab-count'),
  saveTab: () => page.getByTestId('save-env'),
  saveAll: () => page.getByTestId('save-all-env'),
  searchInput: () => page.getByTestId('env-search-input'),
  searchClearBtn: () => page.getByTestId('env-search-input-clear'),
  listItem: (name?: string) => name ? page.getByTestId('env-list-item').filter({ hasText: name }) : page.getByTestId('env-list-item'),
  noResults: () => page.getByTestId('env-no-results'),
  noEnvironmentItem: () => page.getByTestId('env-no-environment-item'),
  searchAction: () => page.getByTestId('env-search-action'),
  savedToast: () => page.getByText('Changes saved successfully').last(),
  collectionEnvTab: () => page.getByTestId('request-tab-environment-settings'),
  globalEnvTab: () => page.getByTestId('request-tab-global-environment-settings'),
  unsavedModal: {
    closeWithoutSave: () => page.getByTestId('env-unsaved-close-without-save'),
    cancel: () => page.getByTestId('env-unsaved-cancel'),
    saveAndClose: () => page.getByTestId('env-unsaved-save-and-close')
  },
  importEmptyStateButton: () => page.getByTestId('empty-state-import-env-btn'),
  importSettingsButton: () => page.getByTestId('import-environment-btn'),
  importModal: (scope: 'collection' | 'global') =>
    page.getByTestId(scope === 'global' ? 'import-global-environment-modal' : 'import-environment-modal'),
  importFileTrigger: (scope: 'collection' | 'global') =>
    page.getByTestId(scope === 'global' ? 'import-global-environment' : 'import-environment'),
  sidebarListItem: (scope: 'collection' | 'global', name: string) =>
    page
      .getByTestId(scope === 'global' ? 'workspace-env-list-item' : 'collection-env-list-item')
      .filter({ hasText: name }),
  // Exact-name variant — `sidebarListItem` substring-matches, so "Production" also matches
  // "Production copy"; use this when a batch can contain both a name and its copy suffix.
  sidebarListItemExact: (scope: 'collection' | 'global', name: string) =>
    page
      .getByTestId(scope === 'global' ? 'workspace-env-list-item' : 'collection-env-list-item')
      .filter({ has: page.getByText(name, { exact: true }) }),
  varRowEnabledCheckbox: (name: string) =>
    page.getByTestId(`env-var-row-${name}`).getByTestId('env-var-enabled-checkbox'),
  resetButton: () => page.getByTestId('reset-env'),
  workspaceEnvTab: () => workspaceEnvTab(page),
  workspaceEnvTabDraftIcon: () => workspaceEnvTab(page).getByTestId('tab-draft-icon'),
  // The `.env` files section is shared by the collection and workspace environment editors.
  dotEnvSection: () => page.getByTestId('dotenv-files-section'),
  createDotEnvFileButton: () => page.getByTestId('create-dotenv-file'),
  dotEnvNameInput: () => page.getByTestId('dotenv-name-input'),
  dotEnvFileItem: (filename: string) =>
    page.getByTestId('dotenv-file-item').filter({ has: page.getByText(filename, { exact: true }) }),
  dotEnvVarRow: (name: string) => page.getByTestId(`dotenv-var-row-${name}`),
  // The trailing empty "add new variable" row's name input.
  dotEnvAddRowNameInput: () => page.getByTestId('dotenv-var-name-input').last(),
  dotEnvVarValueEditor: (name: string) =>
    page.getByTestId(`dotenv-var-row-${name}`).getByTestId(/^test-multiline-editor-\d+\.value$/).locator('.CodeMirror').first(),
  saveDotEnvButton: () => page.getByTestId('save-dotenv'),
  resetDotEnvButton: () => page.getByTestId('reset-dotenv')
  importSubmitButton: (scope: 'collection' | 'global') =>
    page.getByTestId(scope === 'global' ? 'import-global-environment-modal-submit-btn' : 'import-environment-modal-submit-btn'),
  importTotalCount: () => page.getByTestId('env-import-total-count'),
  importDuplicatesWarning: () => page.getByTestId('import-duplicates-warning'),
  importInvalidWarning: () => page.getByTestId('import-invalid-warning'),
  importDuplicatesGroup: () => page.getByTestId('env-import-duplicates-group'),
  importDuplicatesCount: () => page.getByTestId('env-import-duplicates-count'),
  importNewGroup: () => page.getByTestId('env-import-new-group'),
  importNewCount: () => page.getByTestId('env-import-new-count'),
  importDuplicatesGroupSelectAllCheckbox: () => page.getByTestId('env-import-duplicates-group-checkbox'),
  importNewGroupSelectAllCheckbox: () => page.getByTestId('env-import-new-group-checkbox'),
  importSelectedCount: () => page.getByTestId('env-import-selected-count'),
  importReviewItem: (name: string) => page.getByTestId('env-import-item').filter({ has: page.getByText(name, { exact: true }) }),
  importItemCheckbox: (name: string) => buildEnvironmentLocators(page).importReviewItem(name).getByTestId('env-import-item-checkbox'),
  importCopyButton: (name: string) => buildEnvironmentLocators(page).importReviewItem(name).getByTestId('env-import-copy-btn'),
  importReplaceButton: (name: string) => buildEnvironmentLocators(page).importReviewItem(name).getByTestId('env-import-replace-btn'),
  importGroupDropdownTrigger: () => page.getByTestId('env-import-group-dropdown'),
  importGroupDropdownCopyOption: () => page.getByTestId('menu-dropdown-copy'),
  importGroupDropdownReplaceOption: () => page.getByTestId('menu-dropdown-replace'),
  importInvalidGroup: () => page.getByTestId('env-import-invalid-group'),
  importInvalidCount: () => page.getByTestId('env-import-invalid-count'),
  importInvalidItem: (fileName: string) => page.getByTestId('env-import-invalid-item').filter({ has: page.getByText(fileName, { exact: true }) })
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
    await environment.selector().filter({ hasText: 'No Environment' }).waitFor({ state: 'visible' });
  });
};

/**
 * Opens the workspace-level Environments tab, which edits global-scoped environments.
 * @param page - The page object
 */
export const openWorkspaceEnvironmentsTab = async (page: Page) => {
  await test.step('Open the workspace Environments tab', async () => {
    await buildEnvironmentLocators(page).workspaceEnvTab().click();
    await page
      .locator('.request-tab.active')
      .locator('.tab-label')
      .filter({ hasText: /^\s*Environments\s*$/ })
      .waitFor({ state: 'visible' });
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
    await nameInput.waitFor({ state: 'visible' });
    await nameInput.fill(name);
    await nameInput.press('Enter');

    await environment.sidebarListItem(scope, name).waitFor({ state: 'visible' });
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

    await environment.dotEnvFileItem(filename).waitFor({ state: 'visible' });
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
    await environment.dotEnvVarRow(name).waitFor({ state: 'visible' });

    await environment.dotEnvVarValueEditor(name).click();
    await page.keyboard.type(value);
  });
};
