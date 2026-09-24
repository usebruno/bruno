import { test, expect } from '../../../playwright';
import fs from 'fs';
import path from 'path';
import { sendRequest } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

// Regression guard: Save commits the script-set value of an ephemeral env var
// (set via `bru.setEnvVar` without `{ persist: true }`) instead of rolling it
// back to `persistedValue`.

const ENV_FILE_ORIGINAL = `vars {
  host: https://testbench-sanity.usebruno.com
  plain_var: original_plain
}

vars:secret [
  secret_var
]
`;

const restoreEnvFixture = (collectionFixturePath: string) => {
  const envFile = path.join(collectionFixturePath, 'environments', 'EphemeralSave.bru');
  fs.writeFileSync(envFile, ENV_FILE_ORIGINAL, 'utf8');
};

test.describe.serial('bru.setEnvVar(name, value) — Save commits ephemeral overlays', () => {
  test.afterEach(async ({ collectionFixturePath }) => {
    if (collectionFixturePath) restoreEnvFixture(collectionFixturePath);
  });

  test('Save writes the script-set value for plain and secret env vars', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    const locators = buildCommonLocators(page);
    const envTab = page.locator('.request-tab').filter({ hasText: 'Environments' });

    const openEnvEditor = async () => {
      await locators.environment.selector().hover();
      await locators.environment.selector().click();
      await locators.environment.configureButton().hover();
      await locators.environment.configureButton().click();
      await expect(envTab).toBeVisible();
    };

    await test.step('Select the EphemeralSave env and run the request', async () => {
      await page.locator('#sidebar-collection-name').click();
      await page.getByText('api-setEnvVar-ephemeral-save', { exact: true }).click();

      await locators.environment.selector().click();
      await expect(locators.environment.listOption('EphemeralSave')).toBeVisible();
      await locators.environment.listOption('EphemeralSave').click();
      await expect(locators.environment.currentEnvironment()).toContainText('EphemeralSave');

      await sendRequest(page, 200);
    });

    await test.step('Open the env editor and click Save', async () => {
      await openEnvEditor();

      await expect(locators.environment.varRowLine('plain_var')).toHaveText('scripted_plain');

      await locators.environment.saveButton().click();

      const envFile = path.join(collectionFixturePath!, 'environments', 'EphemeralSave.bru');
      await expect
        .poll(() => fs.readFileSync(envFile, 'utf8'), { timeout: 5000 })
        .toMatch(/plain_var:\s*scripted_plain/);

      await envTab.hover();
      await envTab.getByTestId('request-tab-close-icon').click({ force: true });
    });

    await test.step('Plain var is committed to the env file', async () => {
      const envFile = path.join(collectionFixturePath!, 'environments', 'EphemeralSave.bru');
      const content = await fs.promises.readFile(envFile, 'utf8');
      expect(content).toMatch(/plain_var:\s*scripted_plain/);
      expect(content).not.toMatch(/plain_var:\s*original_plain/);
      expect(content).toMatch(/vars:secret\s*\[[\s\S]*secret_var/);
    });

    await test.step('Re-open the env editor — plain var holds the script-set value', async () => {
      // Secret values live in the encrypted store, not the .bru file —
      // covered by buildPersistedEnvVariables in environments.spec.js.
      await openEnvEditor();

      await expect(locators.environment.varRowLine('plain_var')).toHaveText('scripted_plain');

      await envTab.hover();
      await envTab.getByTestId('request-tab-close-icon').click({ force: true });
    });
  });
});
