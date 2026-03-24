import * as fs from 'fs';
import * as path from 'path';
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

test.describe('Environment Variable Descriptions - Write', () => {
  test('writes a multiline description and persists it to the .bru file', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    test.setTimeout(30_000);

    const collection = page
      .getByTestId('collections')
      .locator('#sidebar-collection-name')
      .filter({ hasText: 'env-description' });
    await expect(collection).toBeVisible();
    await collection.click();

    await openEnvironmentConfigure(page, 'WithDescriptions');

    // Set the description value directly via CodeMirror's JS API so that the `change`
    // event fires synchronously and formik receives the update before we save.
    // keyboard.type / insertText are unreliable in Electron because synthetic key events
    // don't always go through CodeMirror's textarea input handler.
    await page.evaluate((rowIndex) => {
      const rows = document.querySelectorAll('tr');
      for (const row of rows) {
        if (row.querySelector(`input[name="${rowIndex}.name"]`)) {
          const cms = row.querySelectorAll('.CodeMirror');
          const cm = (cms[1] as any)?.CodeMirror; // description editor is the 2nd CodeMirror
          if (cm) cm.setValue('First line\nSecond line');
          break;
        }
      }
    }, 2);

    // Wait for the CodeMirror DOM to reflect the value, then give React a tick to flush formik
    const plainDescEditor = buildCommonLocators(page).environment.variableDescriptionEditor(2);
    await expect(plainDescEditor.locator('.CodeMirror-line').nth(0)).toHaveText('First line');
    await page.waitForTimeout(200);

    await page.getByTestId('save-env').click();
    await expect(page.getByText('Changes saved successfully')).toBeVisible({ timeout: 5000 });

    // The IPC write completes before the toast resolves, so the file is ready to read.
    const envFilePath = path.join(collectionFixturePath!, 'environments', 'WithDescriptions.bru');
    const fileContent = fs.readFileSync(envFilePath, 'utf8');

    expect(fileContent).toContain('First line');
    expect(fileContent).toContain('Second line');
  });
});
