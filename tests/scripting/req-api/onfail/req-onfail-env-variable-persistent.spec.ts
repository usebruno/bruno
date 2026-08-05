import { test, expect } from '../../../../playwright';
import { openCollection, selectEnvironment, openRequest, openVariablesTab, openEnvironmentConfigTab } from '../../../utils/page';
import { buildCommonLocators } from '../../../utils/page/locators';

test.describe('req.onFail', () => {
  test('handler writes overwrite the values set in the main body', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await test.step('Send the onFail request — the URL is unreachable, so the handler runs', async () => {
      await openCollection(page, 'onfail-test');
      await selectEnvironment(page, 'Test');
      await openRequest(page, 'onfail-test', 'onFail');
      await locators.request.sendButton().click();
    });

    await test.step('The Variables tab shows the runtime and environment values overwritten', async () => {
      await openVariablesTab(page);
      await expect(locators.variables.runtimeValue('var')).toHaveText('"updated"');
      await expect(locators.variables.environmentValue('envVar')).toHaveText('"updated"');
    });

    await test.step('The global environment shows the value overwritten', async () => {
      await openEnvironmentConfigTab(page, 'global');
      await expect(locators.environment.varRowsByValue('globalEnvVar', 'updated')).toHaveCount(1);
    });
  });
});
