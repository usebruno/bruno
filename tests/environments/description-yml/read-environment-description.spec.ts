import { test, expect, Page } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';

const openEnvironmentConfigure = async (page: Page, envName: string) => {
  const locators = buildCommonLocators(page);
  await locators.environment.currentEnvironment().click();
  await expect(locators.environment.envOption(envName)).toBeVisible();
  await locators.environment.envOption(envName).click();
  await expect(locators.environment.currentEnvironment().filter({ hasText: envName })).toBeVisible();
  await locators.environment.currentEnvironment().click();
  await expect(locators.dropdown.item('Configure')).toBeVisible();
  await locators.dropdown.item('Configure').click();
  await expect(locators.tabs.requestTab('Environments')).toBeVisible();
};

test.describe('Environment Variable Descriptions (YAML) - Read', () => {
  test('reads single-line and multiline descriptions from opencollection.yml environments', async ({
    pageWithUserData: page
  }) => {
    test.setTimeout(30_000);

    const collection = page
      .getByTestId('collections')
      .locator('#sidebar-collection-name')
      .filter({ hasText: 'env-description-yml' });
    await expect(collection).toBeVisible();
    await collection.click();

    await openEnvironmentConfigure(page, 'WithDescriptions');

    const locators = buildCommonLocators(page);

    await expect(page.locator('input[name="0.name"]')).toHaveValue('host');
    const hostDesc = locators.environment.variableDescriptionEditor(0);
    await expect(hostDesc.locator('.CodeMirror-line').first()).toHaveText('Single-line desc');

    await expect(page.locator('input[name="1.name"]')).toHaveValue('token');
    const tokenDesc = locators.environment.variableDescriptionEditor(1);
    await expect(tokenDesc.locator('.CodeMirror-line').nth(0)).toHaveText('Line one');
    await expect(tokenDesc.locator('.CodeMirror-line').nth(1)).toHaveText('Line two');

    await expect(page.locator('input[name="2.name"]')).toHaveValue('plain');
    const plainDesc = locators.environment.variableDescriptionEditor(2);
    await expect(plainDesc.locator('.CodeMirror-line').first()).toHaveText('');
  });
});
