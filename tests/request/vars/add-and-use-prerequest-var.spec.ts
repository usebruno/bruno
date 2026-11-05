import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  openRequest,
  sendRequest,
  saveRequest,
  selectRequestPaneTab,
  switchResponseFormat
} from '../../utils/page';

test.describe('Pre-request variable URL', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('TC-195 resolves baseUrl from pre-request Vars and returns the response', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const collectionName = 'request-vars';
    const requestName = 'add-and-use-prerequest-var';
    const baseUrl = 'http://localhost:8081/ping';
    const { table, request, response } = buildCommonLocators(page);

    await openRequest(page, collectionName, requestName);

    await test.step('Open the Vars tab', async () => {
      await selectRequestPaneTab(page, 'Vars');
    });
    const preRequestVars = table('request-vars-req');
    const row = preRequestVars.row(0);
    await test.step('Add the pre-request variable and save', async () => {
      await preRequestVars.rowNameInput(row).fill('baseUrl');
      await preRequestVars.rowValueEditor(row).click();
      await page.keyboard.type(baseUrl);
      await saveRequest(page);
      await expect(preRequestVars.rowNameInput(row)).toHaveValue('baseUrl');
      await expect(preRequestVars.rowValueEditor(row)).toHaveText(baseUrl);
    });

    await test.step('Send the request', async () => {
      await expect(request.urlLine()).toHaveText('{{baseUrl}}');
      await sendRequest(page, 200);
    });

    await test.step('Response is 200 and the body is pong', async () => {
      await expect(response.statusCode()).toContainText('200');
      await switchResponseFormat(page, 'Raw');
      await expect(response.previewContainer()).toContainText('pong');
    });
  });
});
