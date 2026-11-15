import * as path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  openRequest,
  readEditorValue,
  saveRequest,
  selectRequestPaneTab,
  sendRequest,
  switchResponseFormat
} from '../../utils/page';
import { readSavedRequestVar } from './helpers';

test.describe('Pre-request variable URL', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('TC-195: adds a baseUrl pre-request var, resolves it in the URL and returns the response', { tag: '@sanity' }, async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    const collectionName = 'request-vars';
    const requestName = 'add-and-use-prerequest-var';
    const requestPath = path.join(collectionFixturePath!, `${requestName}.yml`);
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
    });

    await test.step('The variable is saved to the request file', async () => {
      await expect(preRequestVars.rowNameInput(row)).toHaveValue('baseUrl');
      await expect.poll(() => readEditorValue(preRequestVars.rowValueEditor(row))).toBe(baseUrl);
      await expect.poll(() => readSavedRequestVar(requestPath, 'baseUrl')).toBe(baseUrl);
    });

    await test.step('The request URL resolves the pre-request variable', async () => {
      await expect(request.urlLine()).toHaveText('{{baseUrl}}');
      await expect(request.urlVariableToken('baseUrl', 'valid')).toBeVisible();
    });

    await sendRequest(page, 200);

    await test.step('Response body is pong', async () => {
      await switchResponseFormat(page, 'Raw');
      await expect(response.previewContainer()).toContainText('pong');
    });
  });
});
