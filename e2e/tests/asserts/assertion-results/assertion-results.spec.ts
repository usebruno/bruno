import { test, expect } from '../../../playwright';
import {
  addAssertion,
  buildCommonLocators,
  closeAllCollections,
  openRequest,
  selectRequestPaneTab,
  selectResponsePaneTab,
  sendRequest
} from '../../../pages';

const COLLECTION_NAME = 'assertion-results';
const REQUEST_NAME = 'ping';

test.describe('Assertions — results in the response Tests tab', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('TC-200: Verify added assertions under tests section of response', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const { assertionsTable, response } = buildCommonLocators(page);
    const table = assertionsTable();

    await test.step('Open the request and its Assert tab', async () => {
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await selectRequestPaneTab(page, 'Assert');
    });

    await test.step('Add a passing and a failing assertion', async () => {
      await addAssertion(page, { expr: 'res.status', operator: 'eq', value: '200' });
      await addAssertion(page, { expr: 'res.status', operator: 'eq', value: '404' });
    });

    await test.step('Verify that both assertions are added', async () => {
      await expect(table.rowExprInput(0)).toHaveValue('res.status');
      await expect(table.rowExprInput(1)).toHaveValue('res.status');
    });

    await test.step('Send the request', async () => {
      await sendRequest(page);
    });

    await test.step('Verify that the request executes', async () => {
      await expect(response.statusCode()).toContainText('200');
    });

    await test.step('Open the Tests tab of the response', async () => {
      await selectResponsePaneTab(page, 'Tests');
    });

    await test.step('Verify that the assertion results show the count, passed and failed totals and each expression', async () => {
      await expect(response.testSummary('assertions')).toContainText('Assertions (2), Passed: 1, Failed: 1');
      await expect(response.assertionResults.rows()).toContainText(['res.status: eq 200', 'res.status: eq 404']);
      await expect(response.assertionResults.passed()).toContainText(['res.status: eq 200']);
      await expect(response.assertionResults.failed()).toContainText(['res.status: eq 404']);
    });
  });
});
