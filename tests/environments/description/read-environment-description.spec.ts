import { test, expect } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';

const openEnvironmentConfigure = async (page, envName: string) => {
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

test.describe('Environment Variable Descriptions - Read', () => {
  test('reads single-line and multiline descriptions from a pre-existing environment file', async ({
    pageWithUserData: page
  }) => {
    test.setTimeout(30_000);

    const collection = page
      .getByTestId('collections')
      .locator('#sidebar-collection-name')
      .filter({ hasText: 'env-description' });
    await expect(collection).toBeVisible();
    await collection.click();

    await openEnvironmentConfigure(page, 'WithDescriptions');

    const locators = buildCommonLocators(page);

    // row 0: host — single-line description
    await expect(page.locator('input[name="0.name"]')).toHaveValue('host');
    const hostDesc = locators.environment.variableDescriptionEditor(0);
    await expect(hostDesc).toBeVisible();
    await expect(hostDesc.locator('.CodeMirror-line').first()).toHaveText('Single-line desc');

    // row 1: orphaned @description('''empty description''') — empty name/value, description is 'empty description'
    await expect(page.locator('input[name="1.name"]')).toHaveValue('');
    const orphanDesc = locators.environment.variableDescriptionEditor(1);
    await expect(orphanDesc).toBeVisible();
    await expect(orphanDesc.locator('.CodeMirror-line').first()).toHaveText('empty description');

    // row 2: token — gets the last (multiline) description; the first was consumed by the orphaned row
    await expect(page.locator('input[name="2.name"]')).toHaveValue('token');
    const tokenDesc = locators.environment.variableDescriptionEditor(2);
    await expect(tokenDesc).toBeVisible();
    await expect(tokenDesc.locator('.CodeMirror-line').nth(0)).toHaveText('Line one');
    await expect(tokenDesc.locator('.CodeMirror-line').nth(1)).toHaveText('Line two');

    // row 3: plain — no description (editor is empty)
    await expect(page.locator('input[name="3.name"]')).toHaveValue('plain');
    const plainDesc = locators.environment.variableDescriptionEditor(3);
    await expect(plainDesc).toBeVisible();
    await expect(plainDesc.locator('.CodeMirror-line').first()).toHaveText('');

    // row 4: tricky — description containing ''' (stored as triple-quoted @description('''...'''))
    await expect(page.locator('input[name="4.name"]')).toHaveValue('tricky');
    const trickyDesc = locators.environment.variableDescriptionEditor(4);
    await expect(trickyDesc).toBeVisible();
    await expect(trickyDesc.locator('.CodeMirror-line').first()).toHaveText('has \'\'\' triple quotes inside');
  });
});
