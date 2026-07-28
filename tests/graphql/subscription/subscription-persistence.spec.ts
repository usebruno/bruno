import { test, expect, waitForReadyPage } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import { saveRequest } from '../../utils/page/actions';

test('connectionParams and query persist across save and app restart', async ({ pageWithUserData: page, restartApp }) => {
  const locators = buildCommonLocators(page);

  await page.locator('#sidebar-collection-name').click();
  await page.getByTitle(/^on-counter$/).click();
  await locators.graphqlSubscription.tabs.connection().click();

  const editor = locators.graphqlSubscription.connectionParamsEditor();
  await expect(editor).toContainText('authToken');

  await test.step('edit the connection params and save', async () => {
    // insertText avoids CodeMirror's auto-pair smart input corrupting JSON with braces/quotes.
    const wrapper = locators.graphqlSubscription.connectionParams();
    await wrapper.click();
    const textarea = wrapper.locator('textarea');
    await textarea.focus();
    const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';
    await page.keyboard.press(selectAllShortcut);
    await page.keyboard.insertText('{"authToken": "{{token}}", "extra": "e2e-marker"}');
    await saveRequest(page);
  });

  await test.step('restart the app and confirm the edit persisted to disk', async () => {
    const newApp = await restartApp();
    const newPage = await waitForReadyPage(newApp);
    const newLocators = buildCommonLocators(newPage);

    await newPage.locator('#sidebar-collection-name').click();
    await newPage.getByTitle(/^on-counter$/).click();
    await newLocators.graphqlSubscription.tabs.connection().click();

    await expect(newLocators.graphqlSubscription.connectionParamsEditor()).toContainText('e2e-marker');
  });
});
