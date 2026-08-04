import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Global Environment Variable Update via Script', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('should update global environment values via script and verify the changes', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);

    await test.step('Open the collection from sidebar', async () => {
      await locators.sidebar.collection('Global Environment Update').click();
    });

    await test.step('Open the test request that has a pre-request script', async () => {
      await page.locator('.collection-name', { hasText: 'Global Environment Update' }).click();
      await locators.sidebar.request('Test Request').click();
    });

    await test.step('Run the request', async () => {
      await locators.request.sendButton().click();
    });

    await test.step('Open the Global Environment Config tab', async () => {
      await locators.environment.selector().click();
      await locators.environment.globalTab().click();
      await page.getByText('Configure', { exact: true }).click();
      await expect(locators.environment.globalEnvTab()).toBeVisible();
    });

    await test.step('"existingEnvEnabled" is updated by the pre-request script', async () => {
      await expect(
        locators.environment.varRowsByValue('existingEnvEnabled', 'newExistingEnvEnabledValue')
      ).toHaveCount(1);
    });

    await test.step('"existingEnvDisabled" — disabled slot preserved, script write creates a new enabled slot', async () => {
      await expect(locators.environment.varRow('existingEnvDisabled')).toHaveCount(2);
      await expect(
        locators.environment.varRowsByValue('existingEnvDisabled', 'newExistingEnvDisabledValue')
      ).toHaveCount(1);
      await expect(
        locators.environment.varRowsByValue('existingEnvDisabled', /^existingEnvDisabledValue$/)
      ).toHaveCount(1);
    });

    await test.step('"newEnv" is added by the pre-request script', async () => {
      await expect(
        locators.environment.varRowsByValue('newEnv', 'newEnvValue')
      ).toHaveCount(1);
    });

    await test.step('"baseUrl" is unchanged', async () => {
      await expect(
        locators.environment.varRowsByValue('baseUrl', 'https://echo.usebruno.com')
      ).toHaveCount(1);
    });

    await test.step('Close the global environment config tab', async () => {
      const envTab = locators.environment.globalEnvTab();
      await envTab.hover();
      await envTab.getByTestId('request-tab-close-icon').click({ force: true });
    });
  });
});
