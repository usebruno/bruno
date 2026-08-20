import { expect, Page, test } from '../../../../playwright';
import { buildEnvironmentLocators } from '../environments';

/**
 * Locators for the workspace-level Environments tab: the non-closable "Environments"
 * request tab, the environment list, and the `.env` files section with its editor.
 */
export const buildWorkspaceEnvironmentsLocators = (page: Page) => {
  const tab = () =>
    page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Environments' }) });

  const dotEnvFileItem = (filename: string) =>
    page.locator('.environment-item').filter({ hasText: filename });

  return {
    tab,
    tabDraftIcon: () => tab().getByTestId('tab-draft-icon'),
    environmentItem: (name: string) => page.getByTestId('workspace-env-list-item').filter({ hasText: name }),
    resetEnvironmentButton: () => page.getByTestId('reset-env'),
    saveEnvironmentButton: () => page.getByTestId('save-env'),
    dotEnvSection: () => page.getByTestId('dotenv-files-section'),
    createDotEnvFileButton: () => page.getByTestId('create-dotenv-file'),
    dotEnvNameInput: () => page.getByTestId('dotenv-name-input'),
    dotEnvFileItem,
    dotEnvVarRow: (name: string) => page.getByTestId(`dotenv-var-row-${name}`),
    dotEnvAddRowNameInput: () => page.locator('input[placeholder="Name"]').last(),
    saveDotEnvButton: () => page.getByTestId('save-dotenv'),
    resetDotEnvButton: () => page.getByTestId('reset-dotenv')
  };
};

/**
 * Open the workspace-level Environments tab from the workspace tab bar.
 * @param page - The page object
 */
export const openWorkspaceEnvironmentsTab = async (page: Page) => {
  await test.step('Open the workspace Environments tab', async () => {
    const workspaceEnvironments = buildWorkspaceEnvironmentsLocators(page);
    await workspaceEnvironments.tab().click();
    await expect(page.locator('.request-tab.active').locator('.tab-label')).toHaveText('Environments');
  });
};

/**
 * Create a workspace-level environment from the Environments tab sidebar.
 * @param page - The page object
 * @param name - Environment name
 */
export const createWorkspaceEnvironment = async (page: Page, name: string) => {
  await test.step(`Create workspace environment "${name}"`, async () => {
    const environment = buildEnvironmentLocators(page);
    const workspaceEnvironments = buildWorkspaceEnvironmentsLocators(page);

    await environment.settingsCreateButton().click();
    const nameInput = environment.settingsCreateNameInput();
    await expect(nameInput).toBeVisible();
    await nameInput.fill(name);
    await nameInput.press('Enter');

    await expect(workspaceEnvironments.environmentItem(name)).toBeVisible();
  });
};

/**
 * Create a `.env` file in the workspace from the Environments tab's `.env Files` section.
 * @param page - The page object
 * @param filename - Name of the file to create (must start with `.env`)
 */
export const createWorkspaceDotEnvFile = async (page: Page, filename = '.env') => {
  await test.step(`Create workspace "${filename}" file`, async () => {
    const workspaceEnvironments = buildWorkspaceEnvironmentsLocators(page);

    await workspaceEnvironments.dotEnvSection().click();
    await workspaceEnvironments.createDotEnvFileButton().click();
    await workspaceEnvironments.dotEnvNameInput().fill(filename);
    await workspaceEnvironments.dotEnvNameInput().press('Enter');

    await expect(workspaceEnvironments.dotEnvFileItem(filename)).toBeVisible();
  });
};

/**
 * Add a variable to the `.env` file editor currently open in the Environments tab.
 * @param page - The page object
 * @param name - Variable name
 * @param value - Variable value
 */
export const addWorkspaceDotEnvVariable = async (page: Page, name: string, value: string) => {
  await test.step(`Add "${name}" to the open .env file`, async () => {
    const workspaceEnvironments = buildWorkspaceEnvironmentsLocators(page);

    await workspaceEnvironments.dotEnvAddRowNameInput().fill(name);

    const row = workspaceEnvironments.dotEnvVarRow(name);
    await expect(row).toBeVisible();

    const valueEditor = row.getByTestId(/^test-multiline-editor-\d+\.value$/).locator('.CodeMirror').first();
    await valueEditor.click();
    await page.keyboard.type(value);
  });
};
