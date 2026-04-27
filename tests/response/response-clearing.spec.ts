import { test, expect } from '../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  sendRequest,
  addAssertion,
  selectRequestPaneTab,
  clickResponseAction,
  selectResponsePaneTab
} from '../utils/page/actions';
import { buildCommonLocators } from '../utils/page/locators';

test.describe('Response Clearing', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should clear response and all test results across all test tabs', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'response-clear-full-coverage';
    const requestName = 'full-test';

    await test.step('Setup collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, requestName, collectionName, {
        url: 'https://testbench-sanity.usebruno.com/ping'
      });
    });

    await test.step('Add assertion test', async () => {
      await selectRequestPaneTab(page, 'Assert');

      await addAssertion(page, {
        expr: 'res.body.title',
        value: 'pong',
        operator: 'eq'
      });
    });

    await test.step('Send request and verify assertion result exists', async () => {
      await sendRequest(page, 200);

      const locators = buildCommonLocators(page);
      await locators.response.pane().waitFor({ state: 'visible' });

      await selectResponsePaneTab(page, 'Tests');

      const testBadge = locators.paneTabs.responsiveTab('tests');

      await expect(testBadge).toHaveCount(1);
    });

    await test.step('Clear response', async () => {
      await clickResponseAction(page, 'response-clear-btn');
    });

    const locators = buildCommonLocators(page);
    await selectResponsePaneTab(page, 'Tests');

    const testsTab = locators.paneTabs.responsiveTab('tests');

    await expect(testsTab).toBeVisible();
    await expect(testsTab.locator('sup')).toHaveCount(0);
  });
});
