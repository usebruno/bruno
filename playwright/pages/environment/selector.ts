import { test, expect, Page } from '../..';
import { buildEnvironmentLocators } from './environment';

const buildLocators = (page: Page) => ({
  environment: buildEnvironmentLocators(page)
});

export type EnvironmentType = 'collection' | 'global';

/**
 * Open the environment selector panel
 * @param page - The page object
 * @param type - The type of environment tab to select
 * @returns void
 */
export const openEnvironmentSelector = async (page: Page, type: EnvironmentType = 'collection') => {
  await test.step(`Open ${type} environment selector`, async () => {
    const locators = buildLocators(page);

    await locators.environment.selector().click();

    if (type === 'global') {
      await locators.environment.globalTab().click();
      await expect(locators.environment.globalTab()).toHaveClass(/active/);
    } else {
      await locators.environment.collectionTab().click();
      await expect(locators.environment.collectionTab()).toHaveClass(/active/);
    }
  });
};

/**
 * Open the configuration tab for the currently active environment (collection or global).
 * Combines opening the env selector dropdown + clicking the "configure" button + waiting
 * for the resulting env config tab to appear. Use this when the test needs to interact
 * with the env variable rows (read a value, toggle the secret eye, etc.).
 * @param page - The page object
 * @param type - The type of environment configuration tab to open
 */
export const openEnvironmentConfigTab = async (page: Page, type: EnvironmentType = 'collection') => {
  await test.step(`Open ${type} environment configuration tab`, async () => {
    await openEnvironmentSelector(page, type);

    const locators = buildLocators(page);
    // `waitFor` + `dispatchEvent` keeps the click stable when the dropdown is mid-transition;
    // the menu item briefly intercepts pointer events during the open animation.
    await locators.environment.configureButton().waitFor({ state: 'visible' });
    await locators.environment.configureButton().dispatchEvent('click');

    const envTab = type === 'global'
      ? locators.environment.globalEnvTab()
      : locators.environment.collectionEnvTab();
    await expect(envTab).toBeVisible();
  });
};

/**
 * Close the environment tab
 * @param page - The page object
 * @param type - The type of environment tab to close
 * @returns void
 */
export const closeEnvironmentPanel = async (page: Page, type: EnvironmentType = 'collection') => {
  await test.step('Close environment tab', async () => {
    const locators = buildLocators(page);
    const envTab = type === 'global'
      ? locators.environment.globalEnvTab()
      : locators.environment.collectionEnvTab();
    await envTab.hover();
    await envTab.getByTestId('request-tab-close-icon').click({ force: true });
  });
};

/**
 * Select an environment from the dropdown
 * @param page - The page object
 * @param environmentName - The name of the environment to select
 * @param type - The type of environment (collection or global)
 * @returns void
 */
export const selectEnvironment = async (
  page: Page,
  environmentName: string,
  type: EnvironmentType = 'collection'
) => {
  await test.step(`Select ${type} environment "${environmentName}"`, async () => {
    const locators = buildLocators(page);

    await locators.environment.selector().click();

    if (type === 'global') {
      await locators.environment.globalTab().click();
    } else {
      await locators.environment.collectionTab().click();
    }

    const option = environmentName === 'No Environment'
      ? locators.environment.noEnvironmentItem()
      : locators.environment.envOption(environmentName);
    await option.click();

    // Verify selection
    await expect(page.locator('.current-environment')).toContainText(environmentName);
  });
};
