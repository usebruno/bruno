import { test, expect } from '../../../playwright';
import {
  buildRunnerLocators,
  closeAllCollections,
  createFolder,
  expandCollection,
  createRequestViaModal,
  dragRunnerConfigItem,
  expectRunnerConfigOrder,
  expectRunnerResultOrder,
  getRunnerConfigOrder,
  openRunnerTab,
  reopenRunnerConfig,
  toggleRunnerRequestCheckbox,
  validateRunnerResults
} from '../../utils/page';

const COLLECTION_NAME = 'Runner Reorder Collection';
const INITIAL_ORDER = ['Request A', 'Request B', 'Request C', 'Request D', 'Request E'];
const REORDERED = ['Request E', 'Request C', 'Request B', 'Request D', 'Request A'];
const FOLDER_NAME = 'Folder';
const NESTED_REQUEST = 'Nested Request';

test.describe('Runner request reordering', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('TC-719: Validate collection run follows the reordered request sequence', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const runner = buildRunnerLocators(page);
    let initialOrder: string[] = [];

    await test.step('Note the initial order of requests in the run configuration', async () => {
      await openRunnerTab(page, COLLECTION_NAME);
      await expect(runner.requestItems()).toHaveCount(INITIAL_ORDER.length);
      await expect(runner.configCounter()).toHaveText(`${INITIAL_ORDER.length} of ${INITIAL_ORDER.length} selected`);

      initialOrder = await getRunnerConfigOrder(page);
      expect(initialOrder).toEqual(INITIAL_ORDER);
    });

    await test.step('Reorder the requests with drag and drop', async () => {
      await dragRunnerConfigItem(page, 'Request E', 'Request A', 'above');

      await expectRunnerConfigOrder(page, ['Request E', 'Request A', 'Request B', 'Request C', 'Request D']);

      await dragRunnerConfigItem(page, 'Request A', 'Request D', 'below');
      await expectRunnerConfigOrder(page, ['Request E', 'Request B', 'Request C', 'Request D', 'Request A']);

      await dragRunnerConfigItem(page, 'Request C', 'Request B', 'above');
    });

    await test.step('Verify the UI shows the intended order', async () => {
      await expectRunnerConfigOrder(page, REORDERED);
      await expect(runner.configCounter()).toHaveText(`${REORDERED.length} of ${REORDERED.length} selected`);
    });

    await test.step('Start the collection run', async () => {
      // A delay keeps the run in progress long enough to watch the execution order
      await runner.delayInput().fill('500');
      await expect(runner.runCollectionButton()).toHaveText(`Run ${REORDERED.length} Requests`);
      await runner.runCollectionButton().click();
    });

    await test.step('Monitor the execution order during the run', async () => {
      await expect(runner.cancelExecutionButton()).toBeVisible();
      await expect(runner.resultItems().first()).toHaveText(new RegExp(`^${REORDERED[0]}`));
    });

    await test.step('Check the run results after the run completes', async () => {
      await expect(runner.runAgainButton()).toBeVisible({ timeout: 60000 });
      await expectRunnerResultOrder(page, REORDERED);
      await validateRunnerResults(page, { totalRequests: REORDERED.length, passed: REORDERED.length, failed: 0, skipped: 0 });
    });

    await test.step('Compare the execution order with the initial order', async () => {
      expect(REORDERED).not.toEqual(initialOrder);

      await expect(runner.resultItems().first()).not.toHaveText(new RegExp(`^${initialOrder[0]}`));
    });

    await test.step('Reopen the run configuration screen', async () => {
      await reopenRunnerConfig(page);
      await expect(runner.requestItems()).toHaveCount(REORDERED.length);
    });

    await test.step('Verify Reset restores the original request order', async () => {
      // Reset clears the saved runner configuration, custom order included
      await expectRunnerConfigOrder(page, initialOrder);
    });
  });
});

test.describe('Runner request checkboxes', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('TC-713: Each request in the run configuration has a checkbox', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const runner = buildRunnerLocators(page);
    const checkboxOrder = ['Nested Request', 'Request A', 'Request B', 'Request C', 'Request D', 'Request E'];

    await test.step('Add a folder with one nested request', async () => {
      await expandCollection(page, COLLECTION_NAME);
      await createFolder(page, FOLDER_NAME, COLLECTION_NAME);
      await createRequestViaModal(page, FOLDER_NAME, NESTED_REQUEST, { inFolder: true });
    });

    await test.step('Open the run configuration for a collection with root and nested requests', async () => {
      await openRunnerTab(page, COLLECTION_NAME);
      await expect(runner.requestItem(NESTED_REQUEST)).toBeVisible({ timeout: 15000 });
      await expectRunnerConfigOrder(page, checkboxOrder);
    });

    await test.step('A checkbox is present next to each request', async () => {
      await expect(runner.requestCheckboxes()).toHaveCount(checkboxOrder.length);
      for (const name of checkboxOrder) {
        await expect(runner.requestCheckbox(name)).toBeVisible();
      }
    });

    await test.step('A checkbox is present for the request nested in a folder', async () => {
      await expect(runner.requestFolderPath(NESTED_REQUEST)).toHaveText(FOLDER_NAME);
      await expect(runner.requestCheckbox(NESTED_REQUEST)).toBeVisible();
    });

    await test.step('Clicking a checkbox selects and deselects that request', async () => {
      await expect(runner.requestItem('Request A')).toBeEnabled();
      await toggleRunnerRequestCheckbox(page, 'Request A');
      await expect(runner.requestItem('Request A')).not.toHaveClass(/is-selected/);
      await expect(runner.configCounter()).toHaveText(`${checkboxOrder.length - 1} of ${checkboxOrder.length} selected`);

      await toggleRunnerRequestCheckbox(page, 'Request A');
      await expect(runner.requestItem('Request A')).toBeEnabled();
      await expect(runner.configCounter()).toHaveText(`${checkboxOrder.length} of ${checkboxOrder.length} selected`);
    });
  });
});
