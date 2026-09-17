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

  const getScripts = (mode: 'all-pass' | 'all-fail' | 'mixed') => {
    if (mode === 'all-pass') {
      return {
        assertion: { expr: 'res.status', value: '200', operator: 'eq' },
        preRequest: `test('pre-request runs', () => { expect(1).to.equal(1); });`,
        postResponse: `test('post-response runs', () => { expect(res.status).to.equal(200); });`,
        testScript: `test('test script runs', () => { expect(res.status).to.equal(200); });`
      };
    }

    if (mode === 'all-fail') {
      return {
        assertion: { expr: 'res.status', value: '201', operator: 'eq' },
        preRequest: `test('pre-request runs', () => { expect(11).to.equal(0); });`,
        postResponse: `test('post-response runs', () => { expect(res.status).to.equal(201); });`,
        testScript: `test('test script runs', () => { expect(res.status).to.equal(201); });`
      };
    }

    // mixed: 2 pass + 2 fail
    return {
      assertion: { expr: 'res.status', value: '200', operator: 'eq' },
      preRequest: `test('pre-request runs', () => { expect(1).to.equal(0); });`,
      postResponse: `test('post-response runs', () => { expect(res.status).to.equal(201); });`,
      testScript: `test('test script runs', () => { expect(res.status).to.equal(200); });`
    };
  };

  const runScenario = (mode: 'all-pass' | 'all-fail' | 'mixed', expectedCount: string) => {
    test(`should clear response and test results (${mode})`, async ({
      page,
      createTmpDir
    }) => {
      const collectionName = `response-clear-${mode}`;
      const requestName = `test-${mode}`;

      const scripts = getScripts(mode);

      await test.step('Setup collection and request', async () => {
        await createCollection(page, collectionName, await createTmpDir(collectionName));
        await createRequest(page, requestName, collectionName, {
          url: 'https://testbench-sanity.usebruno.com/ping'
        });
      });

      await test.step('Add assertion test', async () => {
        await selectRequestPaneTab(page, 'Assert');

        await addAssertion(page, scripts.assertion);
      });

      await test.step('Add pre-request script test', async () => {
        await addPreRequestScript(page, scripts.preRequest);
      });

      await test.step('Add post-response script test', async () => {
        await addPostResponseScript(page, scripts.postResponse);
      });

      await test.step('Add test script', async () => {
        await addTestScript(page, scripts.testScript);
      });

      const locators = buildCommonLocators(page);
      const testsTab = locators.response.pane().getByTestId('responsive-tab-tests');

      await test.step('Send request and verify tests appear', async () => {
        await sendRequest(page, 200);

        await locators.response.pane().waitFor({ state: 'visible' });

        await selectResponsePaneTab(page, 'Tests');

        await expect(testsTab).toBeVisible();

        await expect(testsTab.locator('sup')).toHaveText(expectedCount);
      });

      await test.step('Clear response', async () => {
        await clickResponseAction(page, 'response-clear-btn');
      });

      await test.step('Verify all test results are cleared', async () => {
        await selectResponsePaneTab(page, 'Tests');

        await expect(testsTab).toBeVisible();
        await expect(testsTab.locator('sup')).toHaveCount(0);
      });
    });
  };

  // Run all scenarios
  runScenario('all-pass', '4');
  runScenario('all-fail', '4');
  runScenario('mixed', '2');
});
