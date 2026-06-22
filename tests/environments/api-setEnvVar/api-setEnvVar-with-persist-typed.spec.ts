import { test, expect, closeElectronApp } from '../../../playwright';
import fs from 'fs';
import path from 'path';
import { sendRequest } from '../../utils/page';

const ENV_FILE_ORIGINAL = `vars {
  host: https://testbench-sanity.usebruno.com
}

vars:secret [
  existing_secret
]
`;

const restoreEnvFixture = (collectionFixturePath: string) => {
  const envFile = path.join(collectionFixturePath, 'environments', 'Typed.bru');
  fs.writeFileSync(envFile, ENV_FILE_ORIGINAL, 'utf8');
};

test.describe.serial('bru.setEnvVar(name, value, { persist: true }) — typed values & secret overwrite', () => {
  test.afterEach(async ({ collectionFixturePath }) => {
    if (collectionFixturePath) {
      restoreEnvFixture(collectionFixturePath);
    }
  });

  test('persists number/boolean/object/string values with the correct dataType annotation', async ({
    pageWithUserData: page,
    collectionFixturePath,
    restartApp
  }) => {
    await test.step('Select the Typed env and run the typed-persist request', async () => {
      await page.locator('#sidebar-collection-name').click();
      await page.getByText('api-setEnvVar-with-persist-typed', { exact: true }).click();

      await page.getByTestId('environment-selector-trigger').click();
      await expect(page.locator('.environment-list .dropdown-item', { hasText: 'Typed' })).toBeVisible();
      await page.locator('.environment-list .dropdown-item', { hasText: 'Typed' }).click();
      await expect(page.locator('.current-environment', { hasText: 'Typed' })).toBeVisible();

      await sendRequest(page, 200);
    });

    await test.step('Verify the env file on disk carries the right dataType annotations', async () => {
      const envFile = path.join(collectionFixturePath!, 'environments', 'Typed.bru');
      const content = await fs.promises.readFile(envFile, 'utf8');

      expect(content).toMatch(/@number\s+typed_num:\s*42/);
      expect(content).toMatch(/@boolean\s+typed_bool:\s*true/);
      // @object values are pretty-printed in a '''…''' block (see jsonToEnv.spec.js).
      expect(content).toMatch(/@object\s+typed_obj:\s*'''[\s\S]*"k":\s*1[\s\S]*'''/);
      // 'string' is the implicit default — not materialized.
      expect(content).not.toMatch(/@string\s+typed_str:/);
      expect(content).toMatch(/typed_str:\s*hello/);

      expect(content).toMatch(/vars:secret\s*\[\s*[\s\S]*existing_secret/);
      // existing_secret is set to the number 99 via bru.setEnvVar, so its value's
      // type is inferred and persisted as @number — same as any non-secret var.
      expect(content).toMatch(/@number\s+existing_secret/);
    });

    await test.step('Restart and verify the env editor reflects the persisted datatypes', async () => {
      const newApp = await restartApp();
      const newPage = await newApp.firstWindow();

      await newPage.locator('#sidebar-collection-name').click();
      await newPage.getByText('api-setEnvVar-with-persist-typed', { exact: true }).click();
      await newPage.getByTestId('environment-selector-trigger').click();
      await newPage.locator('.environment-list .dropdown-item', { hasText: 'Typed' }).click();
      await newPage.getByTestId('environment-selector-trigger').click();
      await newPage.locator('#configure-env').click();

      const envTab = newPage.locator('.request-tab').filter({ hasText: 'Environments' });
      await expect(envTab).toBeVisible();

      await expect(
        newPage.locator('[data-testid="env-var-row-typed_num"] .type-label').first()
      ).toHaveText('number', { timeout: 5000 });
      await expect(
        newPage.locator('[data-testid="env-var-row-typed_bool"] .type-label').first()
      ).toHaveText('boolean');
      await expect(
        newPage.locator('[data-testid="env-var-row-typed_obj"] .type-label').first()
      ).toHaveText('object');
      await expect(
        newPage.locator('[data-testid="env-var-row-typed_str"] .type-label').first()
      ).toHaveText('string');

      await newPage.getByTestId('responsive-tab-secrets').click();

      await expect(
        newPage.locator('[data-testid="env-var-row-existing_secret"]')
      ).toBeVisible();
      // Reloaded with the inferred @number type — the selector shows 'number'.
      await expect(
        newPage.locator('[data-testid="env-var-row-existing_secret"] .type-label')
      ).toHaveText('number');

      await envTab.hover();
      await envTab.getByTestId('request-tab-close-icon').click({ force: true });
      await closeElectronApp(newApp);
    });
  });
});
