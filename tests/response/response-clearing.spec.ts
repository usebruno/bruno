import { test, expect } from '../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  sendRequest,
  addAssertion,
  addPreRequestScript,
  addPostResponseScript,
  addTestScript,
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

    await test.step('Add pre-request script test', async () => {
      await addPreRequestScript(
        page,
        'test(\'pre-request runs\', () => { expect(1).to.equal(0); });'
      );
    });

    await test.step('Add post-response script test', async () => {
      await addPostResponseScript(
        page,
        'test(\'post-response runs\', () => { expect(res.status).to.equal(201); });'
      );
    });

    await test.step('Add test script', async () => {
      await addTestScript(
        page,
        'test(\'test script runs\', () => { expect(res.body.title).to.equal(\'pong\'); });'
      );
    });

    const locators = buildCommonLocators(page);
    const testsTab = locators.response.pane().getByTestId('responsive-tab-tests');

    await test.step('Send request and verify all test result types appear', async () => {
      await sendRequest(page, 200);
      // await page.pause()
      await locators.response.pane().waitFor({ state: 'visible' });

      await selectResponsePaneTab(page, 'Tests');

      await expect(testsTab).toBeVisible();
      // 1 assertion + 1 pre-request test + 1 post-response test + 1 test script = 4
      await expect(testsTab.locator('sup')).toHaveText('4');
    });

    await test.step('Clear response', async () => {
      await clickResponseAction(page, 'response-clear-btn');
    });

    await test.step('Verify all test result counts are cleared', async () => {
      await selectResponsePaneTab(page, 'Tests');

      await expect(testsTab).toBeVisible();
      await expect(testsTab.locator('sup')).toHaveCount(0);
    });
  });
});
