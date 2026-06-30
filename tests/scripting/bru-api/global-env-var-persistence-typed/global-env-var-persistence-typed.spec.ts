import { test, expect } from '../../../../playwright';
import { openCollection, sendRequest, openEnvironmentSelector } from '../../../utils/page';
import { buildCommonLocators } from '../../../utils/page/locators';

test.describe('Script-driven typed global env variable persistence', () => {
  test('bru.setGlobalEnvVar() persists number/boolean/object with correct type labels', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);

    await openCollection(page, 'global-env-var-persistence-typed-test');
    await locators.sidebar.request('set-typed-global-env-vars').click();
    await sendRequest(page, 200);

    await test.step('Open global environment config', async () => {
      await openEnvironmentSelector(page, 'global');
      await locators.environment.configureButton().click();
      await expect(locators.environment.globalEnvTab()).toBeVisible();
    });

    await test.step('Verify globalNum has dataType=number and value 99', async () => {
      const row = locators.environment.variableRowByName('globalNum');
      await expect(row).toBeVisible();
      await expect(locators.dataTypeSelector.typeLabel(row)).toHaveText('number');
      await expect(locators.environment.variableValue('globalNum')).toContainText('99');
    });

    await test.step('Verify globalBool has dataType=boolean and value false', async () => {
      const row = locators.environment.variableRowByName('globalBool');
      await expect(row).toBeVisible();
      await expect(locators.dataTypeSelector.typeLabel(row)).toHaveText('boolean');
      await expect(locators.environment.variableValue('globalBool')).toContainText('false');
    });

    await test.step('Verify globalObj has dataType=object containing the serialized JSON', async () => {
      const row = locators.environment.variableRowByName('globalObj');
      await expect(row).toBeVisible();
      await expect(locators.dataTypeSelector.typeLabel(row)).toHaveText('object');
      await expect(locators.environment.variableValue('globalObj')).toContainText('tier');
      await expect(locators.environment.variableValue('globalObj')).toContainText('premium');
    });

    await test.step('Verify baseUrl (string, untouched) still has no special type label', async () => {
      const row = locators.environment.variableRowByName('baseUrl');
      await expect(row).toBeVisible();
      await expect(locators.dataTypeSelector.typeLabel(row)).toHaveText('string');
    });

    await test.step('Close global environment config', async () => {
      await locators.environment.globalEnvTab().hover();
      await locators.environment.globalEnvTab().getByTestId('request-tab-close-icon').click({ force: true });
    });
  });
});
