import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  openRequest,
  saveRequest,
  selectRequestPaneTab,
  setRequestUrlAndSave,
  switchResponseFormat
} from '../../utils/page';

test.describe('Pre-request variable URL', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-195 resolves baseUrl from pre-request Vars and returns the response', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'Pre-request URL Collection';
    const requestName = 'Base URL Request';
    const baseUrl = 'http://localhost:8081/ping';
    const { table, request, response } = buildCommonLocators(page);

    await test.step('Create the collection and open the request', async () => {
      await createCollection(page, collectionName, await createTmpDir('pre-request-base-url'));
      await createRequest(page, requestName, collectionName, { url: 'https://example.com', method: 'GET' });
      await openRequest(page, collectionName, requestName);
    });

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

    await test.step('Set the request URL to the pre-request variable', async () => {
      await expect(preRequestVars.rowNameInput(row)).toHaveValue('baseUrl');
      await expect(preRequestVars.rowValueEditor(row)).toHaveText(baseUrl);
      await request.urlInput().click();
      await page.keyboard.press('ControlOrMeta+a');
      await page.keyboard.press('Backspace');
      await setRequestUrlAndSave(page, '{{baseUrl}}');
      await expect(request.urlLine()).toHaveText('{{baseUrl}}');
    });

    await test.step('Send the request', async () => {
      await request.sendButton().click();
    });

    await test.step('Response is 200 and the body is pong', async () => {
      await expect(response.statusCode()).toContainText('200');
      await switchResponseFormat(page, 'Raw');
      await expect(response.previewContainer()).toContainText('pong');
    });
  });
});
