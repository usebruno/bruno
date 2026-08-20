import { test, expect } from '../../../../playwright';
import { openCollection, selectEnvironment, openRequest, openEnvironmentConfigTab, setSandboxMode } from '../../../utils/page';
import { openVariablesTab, readVariableValue } from '../../../utils/page/variables-tab';
import { buildCommonLocators } from '../../../utils/page/locators';

test.describe('req.onFail', () => {
  test('handler writes overwrite the values set in the main body', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await test.step('Verify both environments start at their original values', async () => {
      await openCollection(page, 'onfail-collection');
      await setSandboxMode(page, 'onfail-collection', 'developer');
      await selectEnvironment(page, 'Test');
      await selectEnvironment(page, 'Global', 'global');

      await openVariablesTab(page, 'onfail-collection');
      await expect.poll(() => readVariableValue(page, 'environment', 'envVar')).toBe('"original"');

      await openEnvironmentConfigTab(page, 'global');
      await expect(locators.environment.varRowsByValue('globalEnvVar', 'original')).toHaveCount(1);
    });

    await test.step('Send the onFail request — the URL is unreachable, so the handler runs', async () => {
      await openRequest(page, 'onfail-collection', 'onFail');
      await locators.request.sendButton().click();
      await expect(locators.response.errorMessage()).toBeVisible({ timeout: 5000 });
    });

    await test.step('Verify the handler overwrote the runtime, environment and global values', async () => {
      await openVariablesTab(page, 'onfail-collection');
      await expect.poll(() => readVariableValue(page, 'runtime', 'var'), { timeout: 5000 }).toBe('"updated"');
      await expect.poll(() => readVariableValue(page, 'environment', 'envVar'), { timeout: 5000 }).toBe('"updated"');

      await openEnvironmentConfigTab(page, 'global');
      await expect(locators.environment.varRowsByValue('globalEnvVar', 'updated')).toHaveCount(1);
    });
  });
});
