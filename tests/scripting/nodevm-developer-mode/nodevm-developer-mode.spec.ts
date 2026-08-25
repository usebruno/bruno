import { expect, test } from '../../../playwright';
import {
  buildCommonLocators,
  openRequest,
  openRequestInFolder,
  selectResponsePaneTab,
  sendRequest,
  setSandboxMode
} from '../../utils/page';

const COLLECTION = 'nodevm-developer-mode';
const COLLECTION_SCRIPT_COLLECTION = 'nodevm-collection-script-target';

test.describe('Developer mode (NodeVM) awaits async test() callbacks', () => {
  test('Tests tab: sync and async test() results are all present, none dropped', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await setSandboxMode(page, COLLECTION, 'developer');
    await openRequest(page, COLLECTION, '01-tests-tab-async');
    await sendRequest(page, 200);
    await selectResponsePaneTab(page, 'Tests');

    await expect(locators.response.testSummary()).toContainText('Tests (4), Passed: 2, Failed: 2');
    // Settlement order, not script order: a throwing sync callback fails before its first
    // `await`, while a passing one still needs a microtask tick to continue past
    // `await callback()` - so "sync fail" settles before "sync pass".
    await expect(locators.response.assertionResults.rows()).toContainText([
      'sync fail (control)',
      'sync pass (control)',
      'async fail after await (bug check)',
      'async assertion never runs (bug check)'
    ]);
  });

  test('Pre-request script: an async test() callback finishes before the request goes out', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await setSandboxMode(page, COLLECTION, 'developer');
    await openRequest(page, COLLECTION, '02-pre-request-async');
    await sendRequest(page, 200);
    await selectResponsePaneTab(page, 'Tests');

    await expect(locators.response.testSummary()).toContainText('Pre-Request Tests (2), Passed: 2, Failed: 0');
    await expect(locators.response.assertionResults.rows()).toContainText([
      'pre-request sync test (control)',
      'pre-request async test (bug check)'
    ]);
  });

  test('Post-response script: an async test() callback finishes before results are read', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await setSandboxMode(page, COLLECTION, 'developer');
    await openRequest(page, COLLECTION, '03-post-response-async');
    await sendRequest(page, 200);
    await selectResponsePaneTab(page, 'Tests');

    await expect(locators.response.testSummary()).toContainText('Post-Response Tests (2), Passed: 2, Failed: 0');
    await expect(locators.response.assertionResults.rows()).toContainText([
      'post-response sync test (control)',
      'post-response async test (bug check)'
    ]);
  });

  test('All three phases on one request are awaited independently', async ({ pageWithUserData: page }) => {
    await setSandboxMode(page, COLLECTION, 'developer');
    await openRequest(page, COLLECTION, '04-all-phases-async');
    await sendRequest(page, 200);
    await selectResponsePaneTab(page, 'Tests');

    // testSummary() alone is ambiguous once all three sections coexist (its `hasText: 'Tests'`
    // filter matches "Pre-Request Tests"/"Post-Response Tests" too), so each section is
    // matched by its own anchored prefix instead.
    await expect(page.locator('.test-summary').filter({ hasText: /^Pre-Request Tests/ })).toContainText(
      'Pre-Request Tests (2), Passed: 2, Failed: 0'
    );
    await expect(page.locator('.test-summary').filter({ hasText: /^Post-Response Tests/ })).toContainText(
      'Post-Response Tests (2), Passed: 2, Failed: 0'
    );
    await expect(page.locator('.test-summary').filter({ hasText: /^Tests \(/ })).toContainText(
      'Tests (4), Passed: 2, Failed: 2'
    );
  });

  test('Multiple concurrent async test() callbacks are all awaited, not just one', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await setSandboxMode(page, COLLECTION, 'developer');
    await openRequest(page, COLLECTION, '05-multiple-async-tests');
    await sendRequest(page, 200);
    await selectResponsePaneTab(page, 'Tests');

    await expect(locators.response.testSummary()).toContainText('Tests (5), Passed: 5, Failed: 0', { timeout: 10000 });
    await expect(locators.response.assertionResults.rows()).toContainText([
      'sync control',
      'async 100ms',
      'async 300ms',
      'async 500ms',
      'async 700ms'
    ]);
  });

  test('A hung test() callback times out instead of blocking the run forever', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await setSandboxMode(page, COLLECTION, 'developer');
    await openRequest(page, COLLECTION, '06-hung-test-timeout');
    await sendRequest(page, 200);
    await selectResponsePaneTab(page, 'Tests');

    // TEST_AWAIT_TIMEOUT_MS is 5s; give the UI room to actually render after that.
    await expect(locators.response.testSummary()).toContainText('Tests (2), Passed: 2, Failed: 0', { timeout: 15000 });
    await expect(locators.response.assertionResults.rows()).toContainText([
      'sync control (before hang)',
      'sync control (after hang)'
    ]);
    await expect(page.getByText('hung test - never resolves')).toHaveCount(0);
  });

  test('A collection-level test script (defined in opencollection.yml) is awaited for a request with no test script of its own', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await setSandboxMode(page, COLLECTION_SCRIPT_COLLECTION, 'developer');
    await openRequest(page, COLLECTION_SCRIPT_COLLECTION, '01-target');
    await sendRequest(page, 200);
    await selectResponsePaneTab(page, 'Tests');

    await expect(locators.response.testSummary()).toContainText('Tests (2), Passed: 2, Failed: 0');
    await expect(locators.response.assertionResults.rows()).toContainText([
      'collection-level sync test (control)',
      'collection-level async test (bug check)'
    ]);
  });

  test('A folder-level test script (defined in folder.yml) is awaited for a request with no test script of its own', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await setSandboxMode(page, COLLECTION, 'developer');
    await openRequestInFolder(page, 'async-folder', '08-folder-level-target');
    await sendRequest(page, 200);
    await selectResponsePaneTab(page, 'Tests');

    await expect(locators.response.testSummary()).toContainText('Tests (2), Passed: 2, Failed: 0');
    await expect(locators.response.assertionResults.rows()).toContainText([
      'folder-level sync test (control)',
      'folder-level async test (bug check)'
    ]);
  });
});
