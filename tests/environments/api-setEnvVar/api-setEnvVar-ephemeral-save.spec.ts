import { test, expect } from '../../../playwright';
import fs from 'fs';
import path from 'path';
import { sendRequest } from '../../utils/page';

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
    await test.step('Select the EphemeralSave env and run the request', async () => {
      await page.locator('#sidebar-collection-name').click();
      await page.getByText('api-setEnvVar-ephemeral-save', { exact: true }).click();

      await page.getByTestId('environment-selector-trigger').click();
      await expect(page.locator('.environment-list .dropdown-item', { hasText: 'EphemeralSave' })).toBeVisible();
      await page.locator('.environment-list .dropdown-item', { hasText: 'EphemeralSave' }).click();
      await expect(page.locator('.current-environment', { hasText: 'EphemeralSave' })).toBeVisible();

      await sendRequest(page, 200);
    });

    await test.step('Open the env editor and click Save', async () => {
      await page.getByTestId('environment-selector-trigger').hover();
      await page.getByTestId('environment-selector-trigger').click();
      await page.locator('#configure-env').hover();
      await page.locator('#configure-env').click();

      const envTab = page.locator('.request-tab').filter({ hasText: 'Environments' });
      await expect(envTab).toBeVisible();

      const plainLine = page
        .locator('[data-testid="env-var-row-plain_var"] .CodeMirror-line')
        .first();
      await expect(plainLine).toHaveText('scripted_plain');

      await page.getByTestId('save-env').click();

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
      await page.getByTestId('environment-selector-trigger').hover();
      await page.getByTestId('environment-selector-trigger').click();
      await page.locator('#configure-env').hover();
      await page.locator('#configure-env').click();
      const envTab = page.locator('.request-tab').filter({ hasText: 'Environments' });
      await expect(envTab).toBeVisible();

      await expect(
        page.locator('[data-testid="env-var-row-plain_var"] .CodeMirror-line').first()
      ).toHaveText('scripted_plain');

      await envTab.hover();
      await envTab.getByTestId('request-tab-close-icon').click({ force: true });
    });
  });
});
