import { test, expect } from '../../../playwright';
import fs from 'fs';
import path from 'path';
import { openCollection, selectEnvironment, openEnvironmentSelector, sendRequest } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const PERSISTENCE_TIMEOUT = 10000;
const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

test.describe('Draft environment merge with script-set variables', () => {
  test('preserves unsaved draft edits when script sets a new variable', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const locators = buildCommonLocators(page);

    await openCollection(page, 'draft-merge-test');
    await selectEnvironment(page, 'Test');

    await test.step('Edit existingVar in environment UI (create draft)', async () => {
      await openEnvironmentSelector(page, 'collection');
      await locators.environment.configureButton().click();
      await expect(locators.environment.collectionEnvTab()).toBeVisible();

      await expect(locators.environment.variableRowByName('existingVar')).toBeVisible();
      await locators.environment.variableValue('existingVar').click();
      await page.keyboard.press(selectAllShortcut);
      await page.keyboard.type('draft-edited-value');

      await expect(locators.environment.collectionEnvTab().locator('.close-gradient'))
        .toHaveClass(/has-changes/);
    });

    await test.step('Open request and send it', async () => {
      await locators.sidebar.request('set-env-var').click();
      await expect(locators.tabs.requestTab('set-env-var')).toBeVisible();
      await sendRequest(page, 200);
    });

    await test.step('Verify both values in environment UI', async () => {
      await locators.environment.collectionEnvTab().click();

      await expect(locators.environment.variableRowByName('existingVar')).toBeVisible();
      await expect(locators.environment.variableValue('existingVar')).toContainText('draft-edited-value');

      await expect(locators.environment.variableRowByName('scriptToken')).toBeVisible();
      await expect(locators.environment.variableValue('scriptToken')).toContainText('from-script-123');
    });

    await test.step('Verify both values persisted to disk', async () => {
      const envFilePath = path.join(collectionFixturePath!, 'draft-merge-test', 'environments', 'Test.bru');
      await expect.poll(() => {
        const content = fs.readFileSync(envFilePath, 'utf8');
        return content.includes('draft-edited-value') && content.includes('from-script-123');
      }, { timeout: PERSISTENCE_TIMEOUT }).toBe(true);
    });
  });
});
