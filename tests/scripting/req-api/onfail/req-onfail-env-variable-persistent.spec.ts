import { test, expect } from '../../../../playwright';
import { openCollection, selectEnvironment, openRequest, openVariablesTab } from '../../../utils/page';
import { buildCommonLocators } from '../../../utils/page/locators';

test.describe('req.onFail', () => {
  test('handler writes overwrite the values set in the main body', async ({ pageWithUserData: page }) => {
    await test.step('Send the onFail request — the URL is unreachable, so the handler runs', async () => {
      await openCollection(page, 'onfail-test');
      await selectEnvironment(page, 'Test');
      await openRequest(page, 'onfail-test', 'onFail');
      await buildCommonLocators(page).request.sendButton().click();
    });

    await test.step('The Variables tab shows the runtime and environment values overwritten', async () => {
      await openVariablesTab(page);
      const runtimeVar = page.getByTestId('runtime-variables').getByTestId('variable-row-var');
      await expect(runtimeVar.getByTestId('variable-value')).toHaveText('"updated"');

      const envVar = page.getByTestId('environment-variables').getByTestId('variable-row-envVar');
      await expect(envVar.getByTestId('variable-value')).toHaveText('"updated"');
    });
  });
});
