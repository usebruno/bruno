import fs from 'fs';
import path from 'path';
import { test, expect, closeElectronApp } from '../../../playwright';
import { sendRequest, waitForReadyPage } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('bru.setEnvVar(name, value)', () => {
  test('set env var using script persists by default across restart', async ({ pageWithUserData: page, restartApp, collectionFixturePath }) => {
    const stageBruPath = path.join(collectionFixturePath!, 'environments', 'Stage.bru');
    const locators = buildCommonLocators(page);
    const envTab = page.locator('.request-tab').filter({ hasText: 'Environments' });

    const selectStage = async () => {
      await locators.environment.selector().click();
      await expect(locators.environment.listOption('Stage')).toBeVisible();
      await locators.environment.listOption('Stage').click();
      await expect(locators.environment.currentEnvironment()).toContainText('Stage');
    };

    const openEnvEditor = async () => {
      await locators.environment.selector().hover();
      await locators.environment.selector().click();
      await locators.environment.configureButton().waitFor({ state: 'visible' });
      await locators.environment.configureButton().dispatchEvent('click');
      await expect(envTab).toBeVisible();
    };

    // Select the collection and request
    await page.locator('#sidebar-collection-name').click();
    await page.getByText('api-setEnvVar', { exact: true }).click();

    await selectStage();
    await sendRequest(page, 200);

    // Verify the script-set var is visible in the env editor before restart.
    await openEnvEditor();
    const tokenRow = locators.environment.varRow('token');
    await tokenRow.scrollIntoViewIfNeeded();
    await expect(tokenRow).toBeVisible();
    await expect(locators.environment.varRowLine('token')).toHaveText('secret');

    // On-disk env file: setEnvVar persisted `token` to Stage.bru.
    await expect.poll(() => fs.readFileSync(stageBruPath, 'utf8'), { timeout: 5000 })
      .toMatch(/token:\s*secret/);

    await envTab.hover();
    await envTab.getByTestId('request-tab-close-icon').click({ force: true });

    // Restart to confirm the var was persisted to disk (default behavior in v4).
    const newApp = await restartApp();
    const newPage = await waitForReadyPage(newApp);
    const newLocators = buildCommonLocators(newPage);
    const newEnvTab = newPage.locator('.request-tab').filter({ hasText: 'Environments' });

    await newPage.locator('#sidebar-collection-name').click();
    await newPage.getByText('api-setEnvVar', { exact: true }).click();

    // Re-select Stage — active env isn't guaranteed to persist across restart.
    await newLocators.environment.selector().click();
    await expect(newLocators.environment.listOption('Stage')).toBeVisible();
    await newLocators.environment.listOption('Stage').click();
    await expect(newLocators.environment.currentEnvironment()).toContainText('Stage');

    await newLocators.environment.selector().hover();
    await newLocators.environment.selector().click();
    await newLocators.environment.configureButton().waitFor({ state: 'visible' });
    await newLocators.environment.configureButton().dispatchEvent('click');
    await expect(newEnvTab).toBeVisible();

    const newTokenRow = newLocators.environment.varRow('token');
    await newTokenRow.scrollIntoViewIfNeeded();
    await expect(newTokenRow).toBeVisible();
    await expect(newLocators.environment.varRowLine('token')).toHaveText('secret');

    // On-disk env file survived the restart unchanged.
    expect(fs.readFileSync(stageBruPath, 'utf8')).toMatch(/token:\s*secret/);

    await newEnvTab.hover();
    await newEnvTab.getByTestId('request-tab-close-icon').click({ force: true });
    await closeElectronApp(newApp);
  });
});
