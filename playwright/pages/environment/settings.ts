import { test, expect, Page } from '../..';
import { buildEnvironmentLocators } from './environment';
import { openEnvironmentSelector, openEnvironmentConfigTab, type EnvironmentType } from './selector';

const buildLocators = (page: Page) => ({
  environment: buildEnvironmentLocators(page)
});

/**
 * Import a Postman-format environment file into the given scope.
 * @param page - The page object
 * @param filePath - Path to the .postman_environment.json file
 * @param type - Target scope ('collection' | 'global')
 */
export const importEnvironment = async (
  page: Page,
  filePath: string,
  type: EnvironmentType = 'collection'
) => {
  await test.step(`Import ${type} environment from "${filePath}"`, async () => {
    const locators = buildLocators(page);

    await openEnvironmentSelector(page, type);
    await locators.environment.importEmptyStateButton().click();
    await expect(locators.environment.importModal(type)).toBeVisible();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await locators.environment.importFileTrigger(type).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    await locators.environment.importSubmitButton(type).click();

    const settingsTab = type === 'global'
      ? locators.environment.globalEnvTab()
      : locators.environment.collectionEnvTab();
    await expect(settingsTab).toBeVisible();
  });
};

/**
 * Create a new environment
 * @param page - The page object
 * @param environmentName - The name of the environment
 * @param type - The type of environment (collection or global)
 * @returns void
 */
export const createEnvironment = async (
  page: Page,
  environmentName: string,
  type: EnvironmentType = 'collection'
) => {
  await test.step(`Create ${type} environment "${environmentName}"`, async () => {
    const locators = buildLocators(page);
    await openEnvironmentSelector(page, type);

    // Environment selector shows the create button only in empty state.
    // If environments already exist, open settings and use the sidebar create action.
    const canCreateFromSelectorEmptyState = await locators.environment.createEnvButton().isVisible().catch(() => false);

    if (canCreateFromSelectorEmptyState) {
      await locators.environment.createEnvButton().click();

      await expect(locators.environment.createModal()).toBeVisible();
      const nameInput = locators.environment.createModalNameInput();
      await expect(nameInput).toBeVisible();
      await nameInput.fill(environmentName);
      await locators.environment.createModalCreateButton().click();
    } else {
      await locators.environment.configureButton().waitFor({ state: 'visible' });
      await locators.environment.configureButton().dispatchEvent('click');

      const envTab = type === 'global'
        ? locators.environment.globalEnvTab()
        : locators.environment.collectionEnvTab();
      await expect(envTab).toBeVisible();

      await locators.environment.settingsCreateButton().click();

      const inlineNameInput = locators.environment.settingsCreateNameInput();
      await expect(inlineNameInput).toBeVisible();
      await inlineNameInput.fill(environmentName);
      await inlineNameInput.press('Enter');
    }

    const envTab = type === 'global'
      ? locators.environment.globalEnvTab()
      : locators.environment.collectionEnvTab();
    await expect(envTab).toBeVisible();

    await expect(locators.environment.selector()).toBeVisible();
    await locators.environment.selector().click();
    if (type === 'global') {
      await locators.environment.globalTab().click();
    } else {
      await locators.environment.collectionTab().click();
    }
    await locators.environment.envOption(environmentName).click();
    await expect(page.locator('.current-environment')).toContainText(environmentName);
  });
};

/**
 * Rename the environment currently open in the environment settings tab
 * @param page - The page object
 * @param newName - The new name for the environment
 * @returns void
 */
export const renameEnvironment = async (page: Page, newName: string) => {
  await test.step(`Rename environment to "${newName}"`, async () => {
    const locators = buildLocators(page);
    await locators.environment.renameAction().click();

    const nameInput = locators.environment.renameInput();
    await expect(nameInput).toBeVisible();
    await nameInput.fill(newName);
    await nameInput.press('Enter');

    await expect(nameInput).toBeHidden();
  });
};

/**
 * Open an environment from the list in the environment settings tab
 * @param page - The page object
 * @param environmentName - The environment to open
 * @param type - The environment scope the settings tab is showing
 * @returns void
 */
export const openEnvironmentInSettings = async (
  page: Page,
  environmentName: string,
  type: EnvironmentType = 'collection'
) => {
  await test.step(`Open environment "${environmentName}" in the settings tab`, async () => {
    const { environment } = buildLocators(page);

    await environment.sidebarListItemExact(type, environmentName).click();
    await expect(environment.detailsTitle()).toHaveText(environmentName);
  });
};

/**
 * Pick the environment that the currently open environment inherits its variables from
 * @param page - The page object
 * @param parentEnvironmentName - The environment to inherit from, or null to stop inheriting
 * @returns void
 */
export const setEnvironmentInheritance = async (page: Page, parentEnvironmentName: string | null) => {
  await test.step(
    parentEnvironmentName ? `Inherit variables from "${parentEnvironmentName}"` : 'Stop inheriting variables',
    async () => {
      const locators = buildLocators(page);
      await locators.environment.inheritsFromAction().click();

      const option = parentEnvironmentName
        ? locators.environment.inheritsFromOption(parentEnvironmentName)
        : locators.environment.inheritsFromNoneOption();
      await option.click();

      const toastText = parentEnvironmentName
        ? `Inheriting variables from ${parentEnvironmentName}`
        : 'Stopped inheriting variables';
      await expect(page.getByText(toastText).last()).toBeVisible();
    }
  );
};

/**
 * Copy the environment currently open in the environment settings tab
 * @param page - The page object
 * @param newName - Name for the copy
 * @returns void
 */
export const copyEnvironment = async (page: Page, newName: string) => {
  await test.step(`Copy environment to "${newName}"`, async () => {
    const locators = buildLocators(page);
    await locators.environment.copyAction().click();

    const modal = page.locator('.bruno-modal').filter({ hasText: 'Copy Environment' });
    await modal.locator('#environment-name').fill(newName);
    await modal.getByRole('button', { name: 'Copy', exact: true }).click();
    await modal.waitFor({ state: 'hidden' });
  });
};

/**
 * Delete the environment currently open in the environment settings tab
 * @param page - The page object
 * @returns void
 */
export const deleteEnvironment = async (page: Page) => {
  await test.step('Delete the open environment', async () => {
    const locators = buildLocators(page);
    await locators.environment.deleteAction().click();

    const modal = page.locator('.bruno-modal').filter({ hasText: 'Delete Environment' });
    await modal.getByRole('button', { name: 'Delete', exact: true }).click();
    await modal.waitFor({ state: 'hidden' });
  });
};

/**
 * Delete every global environment in the workspace. Global environments persist at
 * the workspace level (closeAllCollections does not remove them), so call this to keep
 * tests isolated. Deletes the currently-selected environment first, since a tab with
 * unsaved changes blocks switching to another env via the list.
 * @param page - The page object
 * @returns void
 */
export const deleteAllGlobalEnvironments = async (page: Page) => {
  await test.step('Delete all global environments', async () => {
    await page.getByTestId('environment-selector-trigger').click();
    await page.getByTestId('env-tab-global').click();
    await page.getByTestId('configure-env').click();

    const envItems = page.locator('.environment-item');
    const deleteBtn = page.locator('button[title="Delete"]');
    const modal = page.locator('.bruno-modal').filter({ hasText: 'Delete Environment' });

    await page.locator('.environments-container').first().waitFor({ state: 'visible' }).catch(() => { });

    while (true) {
      if ((await deleteBtn.count()) === 0) {
        if ((await envItems.count()) === 0) break;
        await envItems.first().click();
        await deleteBtn.waitFor({ state: 'visible' });
      }
      await deleteBtn.first().click();
      await modal.getByRole('button', { name: 'Delete', exact: true }).click();
      await modal.waitFor({ state: 'hidden' });
    }
  });
};

/**
 * Save the current environment settings
 * @param page - The page object
 * @returns void
 */
export const saveEnvironment = async (page: Page) => {
  await test.step('Save environment', async () => {
    await page.getByTestId('save-all-env').click();
  });
};

/**
 * Opens the environment import review modal and selects the given files.
 * @param page - The Playwright Page object
 * @param scope - The environment scope ('collection' | 'global')
 * @param filePaths - The paths to the environment files to import
 */
export const openImportReview = async (page: Page, scope: 'collection' | 'global', ...filePaths: string[]) => {
  const { environment } = buildLocators(page);
  await openEnvironmentConfigTab(page, scope);
  await environment.importSettingsButton().click();
  await environment.importModal(scope).waitFor({ state: 'visible' });

  const fileChooserPromise = page.waitForEvent('filechooser');
  await environment.importFileTrigger(scope).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(filePaths);
};
