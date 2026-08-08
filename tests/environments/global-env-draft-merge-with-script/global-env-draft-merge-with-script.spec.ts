import { test, expect } from '../../../playwright';
import { openCollection, sendRequest, openEnvironmentSelector } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Global environment draft merge with script-set variables', () => {
  test('preserves unsaved draft edits when script sets a new global env variable', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);

    await openCollection(page, 'global-env-draft-merge-test');

    await test.step('Edit existingVar in global environment UI (create draft)', async () => {
      await openEnvironmentSelector(page, 'global');
      await locators.environment.configureButton().click();
      await expect(locators.environment.globalEnvTab()).toBeVisible();

      await expect(locators.environment.variableRowByName('existingVar')).toBeVisible();
      const valueEditor = locators.environment.variableValue('existingVar');
      await valueEditor.click();
      // keyboard select-all/type is flaky against CodeMirror under Electron load (same as
      // write-environment-description) — setValue fires the change event reliably.
      await valueEditor.evaluate((el, value) => {
        const cm = (el as any).CodeMirror;
        if (!cm) throw new Error('CodeMirror instance missing on env value editor');
        cm.setValue(value);
      }, 'draft-edited-global-value');
      await expect(valueEditor).toContainText('draft-edited-global-value');

      await expect(locators.environment.globalEnvTab().locator('.close-gradient'))
        .toHaveClass(/has-changes/);
    });

    await test.step('Open request and send it', async () => {
      await locators.sidebar.request('set-global-env-var').click();
      await expect(locators.tabs.requestTab('set-global-env-var')).toBeVisible();
      await sendRequest(page, 200);
    });

    await test.step('Verify both draft edit and script variable in global env UI', async () => {
      await locators.environment.globalEnvTab().click();

      await expect(locators.environment.variableRowByName('existingVar')).toBeVisible();
      await expect(locators.environment.variableValue('existingVar')).toContainText('draft-edited-global-value');

      await expect(locators.environment.variableRowByName('scriptGlobalToken')).toBeVisible();
      await expect(locators.environment.variableValue('scriptGlobalToken')).toContainText('from-script-456');

      await expect(locators.environment.variableRowByName('baseUrl')).toBeVisible();
      await expect(locators.environment.variableValue('baseUrl')).toContainText('https://testbench-sanity.usebruno.com');
    });
  });
});
