import * as path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  importCollection,
  openRequest,
  selectRequestPaneTab,
  sendRequest
} from '../../utils/page';

const collectionName = 'Unquoted Query Params';
const requestName = 'Query Request';

test.describe('Import Insomnia collection with unquoted query params', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-3177: Verify the working of insomnia imported requests containing unquoted values in Query params', { tag: '@sanity' }, async ({
    page,
    createTmpDir
  }) => {
    const { sidebar, request, response, table } = buildCommonLocators(page);
    const insomniaFile = path.resolve(__dirname, 'fixtures', 'insomnia-unquoted-query-params.yaml');

    await test.step('Import the Insomnia collection', async () => {
      await importCollection(page, insomniaFile, await createTmpDir('insomnia-unquoted-query-params'), {
        expectedCollectionName: collectionName
      });
      await expect(sidebar.collection(collectionName)).toBeVisible();
    });

    await test.step('Query params keep the unquoted imported values', async () => {
      await openRequest(page, collectionName, requestName);
      await selectRequestPaneTab(page, 'Params');
      await request.queryParams.rowByName('date').waitFor({ state: 'visible' });

      await expect(request.queryParams.valueByName('date')).toContainText('2024-01-01');
      await expect(request.queryParams.valueByName('count')).toContainText('42');
      await expect(request.queryParams.valueByName('enabled')).toContainText('true');
    });

    await test.step('Sending the request uses the imported query param values', async () => {
      const dateEnabled = table('query-params-table').rowCheckboxByName('date');
      await dateEnabled.click();
      await dateEnabled.click();
      await expect(request.urlLine()).toContainText('date=2024-01-01');
      await expect(request.urlLine()).toContainText('count=42');
      await expect(request.urlLine()).toContainText('enabled=true');

      await sendRequest(page, 200);
      await expect(response.body()).toContainText('"date": "2024-01-01"');
      await expect(response.body()).toContainText('"count": "42"');
      await expect(response.body()).toContainText('"enabled": "true"');
    });
  });
});
