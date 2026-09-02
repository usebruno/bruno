import { expect, test } from '../../../playwright';
import {
  buildCommonLocators,
  openRequest,
  openRequestInFolder,
  selectResponsePaneTabViaOverflow,
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
    // "Tests" never fits directly at this window size, so go straight to the overflow.
    await selectResponsePaneTabViaOverflow(page, 'Tests');

    await expect(locators.response.testSummary('tests')).toContainText('Tests (4), Passed: 2, Failed: 2');
    // Settlement order, not script order: a sync failure settles before a sync pass.
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
    await selectResponsePaneTabViaOverflow(page, 'Tests');

    await expect(locators.response.testSummary('preRequest')).toContainText('Pre-Request Tests (2), Passed: 2, Failed: 0');
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
    await selectResponsePaneTabViaOverflow(page, 'Tests');

    await expect(locators.response.testSummary('postResponse')).toContainText('Post-Response Tests (2), Passed: 2, Failed: 0');
    await expect(locators.response.assertionResults.rows()).toContainText([
      'post-response sync test (control)',
      'post-response async test (bug check)'
    ]);
  });

  test('Pre-request, post-response, and tests scripts on one request are each awaited independently', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    await setSandboxMode(page, COLLECTION, 'developer');
    await openRequest(page, COLLECTION, '04-all-phases-async');
    await sendRequest(page, 200);
    await selectResponsePaneTabViaOverflow(page, 'Tests');

    await expect(locators.response.testSummary('preRequest')).toContainText(
      'Pre-Request Tests (2), Passed: 2, Failed: 0'
    );
    await expect(locators.response.testSummary('postResponse')).toContainText(
      'Post-Response Tests (2), Passed: 2, Failed: 0'
    );
    await expect(locators.response.testSummary('tests')).toContainText(
      'Tests (4), Passed: 2, Failed: 2'
    );
  });

  test('Tests tab: multiple concurrent async test() callbacks are all awaited, not just one', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await setSandboxMode(page, COLLECTION, 'developer');
    await openRequest(page, COLLECTION, '05-multiple-async-tests');
    await sendRequest(page, 200);
    await selectResponsePaneTabViaOverflow(page, 'Tests');

    await expect(locators.response.testSummary('tests')).toContainText('Tests (5), Passed: 5, Failed: 0');
    await expect(locators.response.assertionResults.rows()).toContainText([
      'sync control',
      'async 100ms',
      'async 300ms',
      'async 500ms',
      'async 700ms'
    ]);
  });

  test('Tests tab: an async test() callback awaiting a real outgoing request (bru.sendRequest) is not dropped', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await setSandboxMode(page, COLLECTION, 'developer');
    await openRequest(page, COLLECTION, '07-real-request-async-test');
    await sendRequest(page, 200);

    await selectResponsePaneTabViaOverflow(page, 'Tests');
    await expect(locators.response.testSummary('tests')).toContainText('Tests (2), Passed: 2, Failed: 0');
    await expect(locators.response.assertionResults.rows()).toContainText([
      'sync pass (control)',
      'async test awaiting a real request (bug check)'
    ]);
  });

  test('A request has no test script of its own, so it inherits the collection-level one (opencollection.yml) - that gets awaited too', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await setSandboxMode(page, COLLECTION_SCRIPT_COLLECTION, 'developer');
    await openRequest(page, COLLECTION_SCRIPT_COLLECTION, '01-target');
    await sendRequest(page, 200);
    await selectResponsePaneTabViaOverflow(page, 'Tests');

    await expect(locators.response.testSummary('tests')).toContainText('Tests (2), Passed: 2, Failed: 0');
    await expect(locators.response.assertionResults.rows()).toContainText([
      'collection-level sync test (control)',
      'collection-level async test (bug check)'
    ]);
  });

  test('A request has no test script of its own, so it inherits the folder-level one (folder.yml) - that gets awaited too', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await setSandboxMode(page, COLLECTION, 'developer');
    await openRequestInFolder(page, 'async-folder', '08-folder-level-target');
    await sendRequest(page, 200);
    await selectResponsePaneTabViaOverflow(page, 'Tests');

    await expect(locators.response.testSummary('tests')).toContainText('Tests (2), Passed: 2, Failed: 0');
    await expect(locators.response.assertionResults.rows()).toContainText([
      'folder-level sync test (control)',
      'folder-level async test (bug check)'
    ]);
  });
});
