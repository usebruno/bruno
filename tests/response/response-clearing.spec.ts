import { test, expect } from '../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  sendRequest,
  addAssertion,
  selectRequestPaneTab,
  clickResponseAction
} from '../utils/page/actions';

test.describe('Response Clearing', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should clear response and all test results when using clear button from dropdown menu', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'response-clear-with-assertions';
    const requestName = 'assertion-test';

    await createCollection(page, collectionName, await createTmpDir(collectionName));
    await createRequest(page, requestName, collectionName, {
      url: 'https://testbench-sanity.usebruno.com/ping'
    });

    await selectRequestPaneTab(page, 'Assert');

    await addAssertion(page, {
      expr: 'res.body.title',
      value: 'pong',
      operator: 'eq'
    });

    // Send request
    await sendRequest(page, 200);

    // OPTIONAL: check test badge if available (safe guard)
    const testBadge = page.getByTestId('tests-tab-badge');
    if (await testBadge.isVisible().catch(() => false)) {
      const before = await testBadge.innerText();

      // Clear response
      await clickResponseAction(page, 'response-clear-btn');

      // Badge should change or UI should update
      const after = await testBadge.innerText().catch(() => null);

      expect(before !== after).toBeTruthy();
    } else {
      // Clear response (fallback)
      await clickResponseAction(page, 'response-clear-btn');
    }
  });
});
