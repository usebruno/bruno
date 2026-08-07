import path from 'path';
import fs from 'fs';
import { test as base, expect } from '../../../../playwright';
import { openCollection, selectEnvironment, openRequest, openVariablesTab, openEnvironmentConfigTab } from '../../../utils/page';
import { buildCommonLocators } from '../../../utils/page/locators';

const FIXTURE_DIR = path.join(__dirname, '../../../../packages/bruno-tests/workspaces/onfail');

const test = base.extend({
  workspaceFixturePath: async ({ createTmpDir }, use) => {
    const tmpDir = await createTmpDir('workspace');
    await fs.promises.cp(FIXTURE_DIR, tmpDir, { recursive: true });
    await use(tmpDir);
  }
});

test.describe('req.onFail', () => {
  test('handler writes overwrite the values set in the main body', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await test.step('Send the onFail request — the URL is unreachable, so the handler runs', async () => {
      await openCollection(page, 'onfail-collection');
      await selectEnvironment(page, 'Test');
      await selectEnvironment(page, 'Global', 'global');
      await openRequest(page, 'onfail-collection', 'onFail');
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
