import { test, expect } from '../../../../playwright';
import { openCollection, selectEnvironment, openRequest, openVariablesTab, openEnvironmentConfigTab } from '../../../utils/page';
import { buildCommonLocators } from '../../../utils/page/locators';

test.describe('req.onFail', () => {
  test('handler writes overwrite the values set in the main body', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await test.step('Verify both environments start at their original values', async () => {
      await openCollection(page, 'onfail-collection');
      await selectEnvironment(page, 'Test');
      await selectEnvironment(page, 'Global', 'global');

      await openVariablesTab(page);
      await expect(locators.variables.environmentValue('envVar')).toHaveText('"original"');

      await openEnvironmentConfigTab(page, 'global');
      await expect(locators.environment.varRowsByValue('globalEnvVar', 'original')).toHaveCount(1);
    });

    await test.step('Send the onFail request — the URL is unreachable, so the handler runs', async () => {
      await openRequest(page, 'onfail-collection', 'onFail');
      await locators.request.sendButton().click();
    });

    await test.step('Verify the handler overwrote the runtime, environment and global values', async () => {
      await openVariablesTab(page);
      await expect(locators.variables.runtimeValue('var')).toHaveText('"updated"');
      await expect(locators.variables.environmentValue('envVar')).toHaveText('"updated"');

      await openEnvironmentConfigTab(page, 'global');
      await expect(locators.environment.varRowsByValue('globalEnvVar', 'updated')).toHaveCount(1);
    });
  });
});
