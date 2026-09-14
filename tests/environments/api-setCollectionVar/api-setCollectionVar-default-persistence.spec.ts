import fs from 'fs';
import path from 'path';
import { test, expect, closeElectronApp } from '../../../playwright';
import { sendRequest, waitForReadyPage } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe.serial('bru.setCollectionVar(name, value) - default persistence', () => {
  test('collection var set via script persists across restart', async ({
    pageWithUserData: page,
    restartApp,
    collectionFixturePath
  }) => {
    const collectionBruPath = path.join(collectionFixturePath!, 'collection.bru');
    const locators = buildCommonLocators(page);

    const openCollectionVarsTab = async (p = page) => {
      const l = buildCommonLocators(p);
      await l.sidebar.collection('collection').click();
      await l.paneTabs.collectionSettingsTab('vars').click();
    };

    // Open collection, run the request — script writes `token: secret` to collection vars.
    await locators.sidebar.collection('collection').click();
    await page.getByText('api-setCollectionVar-default-persistence', { exact: true }).click();
    await sendRequest(page, 200);

    // Pre-restart UI: vars tab shows the script-set var.
    await openCollectionVarsTab();
    await expect(locators.environment.variableRowByName('token')).toBeVisible();
    await expect(locators.environment.variableValue('token')).toContainText('secret');

    // Pre-restart disk: collection.bru contains `token: secret`.
    await expect.poll(() => fs.readFileSync(collectionBruPath, 'utf8'), { timeout: 5000 })
      .toMatch(/token:\s*secret/);

    // Restart and re-verify both UI and disk.
    const newApp = await restartApp();
    const newPage = await waitForReadyPage(newApp);
    const newLocators = buildCommonLocators(newPage);

    await openCollectionVarsTab(newPage);
    await expect(newLocators.environment.variableRowByName('token')).toBeVisible();
    await expect(newLocators.environment.variableValue('token')).toContainText('secret');

    expect(fs.readFileSync(collectionBruPath, 'utf8')).toMatch(/token:\s*secret/);

    await closeElectronApp(newApp);
  });
});
