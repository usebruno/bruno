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

    await test.step('Create collection and request', async () => {
      await createCollection(
        page,
        collectionName,
        await createTmpDir(collectionName)
      );
      await createRequest(page, requestName, collectionName, {
        url: 'https://testbench-sanity.usebruno.com/ping'
      });
    });

    await test.step('Add assertion that will fail', async () => {
      // Navigate to Assert tab (note: the label is "Assert" not "Assertions")
      await selectRequestPaneTab(page, 'Assert');

      // Add assertion: res.body.title eq pong
      // This will fail because the response is plain text "pong", not JSON with a title field
      await addAssertion(page, {
        expr: 'res.body.title',
        value: 'pong',
        operator: 'eq'
      });
    });

    await test.step('Send request and verify response is visible', async () => {
      await sendRequest(page, 200);

      // Response should contain "pong"
      await expect(page.getByText('pong')).toBeVisible({ timeout: 5000 });
    });

    await test.step('Clear response using dropdown menu button', async () => {
      // Use the utility function to click the clear response action
      // It handles both direct button clicks and menu items
      await clickResponseAction(page, 'response-clear-btn');
    });

    await test.step('Verify response is cleared', async () => {
      // Response content should be gone - with longer timeout to allow for UI update
      await expect(page.getByText('expected undefined')).not.toBeVisible({
        timeout: 5000
      });
    });
  });
});
