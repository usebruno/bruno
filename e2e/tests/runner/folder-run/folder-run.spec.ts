import { test, expect } from '../../../playwright';
import {
  openFolderRunModal,
  folderRunButton,
  folderRunCount,
  folderRunDelayInput,
  dismissFolderRunModal,
  addRunnerTag,
  clearRunnerTags,
  buildRunnerLocators,
  buildRunnerTagLocators,
  getRunnerResultResponseTimeMs
} from '../../../pages/runner';
import { buildCommonLocators } from '../../../pages';

const COLLECTION_NAME = 'folder-run';

const PARENT_REQUESTS = ['first', 'second', 'third'];
const CHILD_REQUESTS = ['child-first', 'child-second'];
// Every request in the collection: parent (3) + parent/child (2) + rerun (1)
const TOTAL_REQUESTS_IN_COLLECTION = 6;

// The status shown beside a passing request with a space. i.e 200 - OK
const RUNNER_OK_STATUS = /^200\s*-\s*OK$/;

test.describe('Folder runner', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await dismissFolderRunModal(page);
  });

  test('TC-175: Verify the folder run modal offers the runner options and run buttons, and executes only the requests directly under the folder, in order', { tag: '@sanity' }, async ({
    pageWithUserData: page
  }) => {
    const runner = buildRunnerLocators(page);

    const modal = await openFolderRunModal(page, COLLECTION_NAME, ['parent']);
    await clearRunnerTags(page, modal);

    const runnerTags = buildRunnerTagLocators(page, modal);

    await test.step('Verify that the run modal offers the runner options and run buttons', async () => {
      await expect(folderRunCount(modal, 'Run')).toContainText(`(${PARENT_REQUESTS.length} requests)`);
      await expect(folderRunCount(modal, 'Recursive Run')).toContainText(
        `(${PARENT_REQUESTS.length + CHILD_REQUESTS.length} requests)`
      );
      await expect(folderRunDelayInput(modal)).toBeVisible();
      await expect(runnerTags.column('Include')).toBeVisible();
      await expect(runnerTags.column('Exclude')).toBeVisible();
      await expect(modal.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
      await expect(folderRunButton(modal, 'Recursive Run')).toBeEnabled();
      await expect(folderRunButton(modal, 'Run')).toBeEnabled();
    });

    await test.step('Click Run', async () => {
      await folderRunButton(modal, 'Run').click();
      await runner.runAgainButton().waitFor();
    });

    await test.step('The dashboard lists the folder\'s own requests in sequence order, and none from the subfolder', async () => {
      await expect(runner.resultItems()).toHaveCount(PARENT_REQUESTS.length);
      await expect(runner.resultItems()).toContainText(PARENT_REQUESTS);
      await expect(runner.resultStatus()).toHaveText(PARENT_REQUESTS.map(() => RUNNER_OK_STATUS));
    });

    await test.step('The dashboard shows every request under the default "all" filter', async () => {
      await expect(runner.allCount()).toHaveText(`${PARENT_REQUESTS.length}`);
      await expect(runner.passedCount()).toHaveText(`${PARENT_REQUESTS.length}`);
      await expect(runner.failedCount()).toHaveText('0');
      await expect(runner.skippedCount()).toHaveText('0');
    });
  });

  test('TC-176: Verify the recursive run executes the folder and its subfolders in order', { tag: '@sanity' }, async ({
    pageWithUserData: page
  }) => {
    const runner = buildRunnerLocators(page);
    // A recursive run executes a folder's subfolders before the requests that sit directly in it.
    const expectedOrder = [...CHILD_REQUESTS, ...PARENT_REQUESTS];

    const modal = await openFolderRunModal(page, COLLECTION_NAME, ['parent']);
    await clearRunnerTags(page, modal);

    await test.step('The run modal offers the runner options and run buttons', async () => {
      await expect(folderRunCount(modal, 'Recursive Run')).toContainText(`(${expectedOrder.length} requests)`);
      await expect(folderRunDelayInput(modal)).toBeVisible();
      await expect(modal.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
    });

    await test.step('Click Recursive Run', async () => {
      await folderRunButton(modal, 'Recursive Run').click();
      await runner.runAgainButton().waitFor();
    });

    await test.step('Requests from the child folder and the parent folder run in folder-structure order', async () => {
      await expect(runner.resultItems()).toHaveCount(expectedOrder.length);
      await expect(runner.resultItems()).toContainText(expectedOrder);
      await expect(runner.resultStatus()).toHaveText(expectedOrder.map(() => RUNNER_OK_STATUS));
    });

    await test.step('The dashboard shows all, passed, failed and skipped counts', async () => {
      await expect(runner.allCount()).toHaveText(`${expectedOrder.length}`);
      await expect(runner.passedCount()).toHaveText(`${expectedOrder.length}`);
      await expect(runner.failedCount()).toHaveText('0');
      await expect(runner.skippedCount()).toHaveText('0');
    });
  });

  test('TC-492: Verify the run from the folder menu executes every request under the folder and reports status codes', { tag: '@sanity' }, async ({
    pageWithUserData: page
  }) => {
    const runner = buildRunnerLocators(page);

    const modal = await openFolderRunModal(page, COLLECTION_NAME, ['parent']);
    await clearRunnerTags(page, modal);

    await test.step('The "Collection Runner" modal reports the request counts and offers all options', async () => {
      await expect(modal).toContainText('Collection Runner');
      await expect(folderRunCount(modal, 'Run')).toContainText(`(${PARENT_REQUESTS.length} requests)`);
      await expect(folderRunCount(modal, 'Recursive Run')).toContainText(
        `(${PARENT_REQUESTS.length + CHILD_REQUESTS.length} requests)`
      );
      await expect(folderRunDelayInput(modal)).toBeVisible();
      await expect(buildRunnerTagLocators(page, modal).column('Include')).toBeVisible();
      await expect(buildRunnerTagLocators(page, modal).column('Exclude')).toBeVisible();
      await expect(modal.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
      await expect(folderRunButton(modal, 'Recursive Run')).toBeVisible();
      await expect(folderRunButton(modal, 'Run')).toBeVisible();
    });

    await test.step('Run the folder', async () => {
      await folderRunButton(modal, 'Run').click();
      await runner.runAgainButton().waitFor();
    });

    await test.step('The execution dashboard lists the requests in order with their status codes', async () => {
      await expect(runner.resultItems()).toHaveCount(PARENT_REQUESTS.length);
      await expect(runner.resultItems()).toContainText(PARENT_REQUESTS);
      await expect(runner.resultStatus()).toHaveText(PARENT_REQUESTS.map(() => RUNNER_OK_STATUS));
    });

    await test.step('The all, passed, failed and skipped filters are available', async () => {
      await expect(runner.filterButton('all')).toBeVisible();
      await expect(runner.filterButton('passed')).toBeVisible();
      await expect(runner.filterButton('failed')).toBeVisible();
      await expect(runner.filterButton('skipped')).toBeVisible();
    });
  });

  test('TC-2675: Verify the delay between requests spaces out the requests in the folder run', { tag: '@sanity' }, async ({
    pageWithUserData: page
  }) => {
    test.setTimeout(60_000);
    const runner = buildRunnerLocators(page);
    // The delay between requests to be passed to Runner. I have set it to 2 seconds to keep adequate margin for thresholds.
    const delayBetweenRequestsMs = 2_000;
    // Tolerance for playwright polling that observes the loader, and for the runner's own work around each request.
    const toleranceMs = 150;
    // Maximum overhead for the runner's own work around each request.
    const maxOverheadMs = 1_000;

    const modal = await openFolderRunModal(page, COLLECTION_NAME, ['parent']);
    await clearRunnerTags(page, modal);

    await test.step('Enter a delay between requests', async () => {
      await folderRunDelayInput(modal).fill(`${delayBetweenRequestsMs}`);
      await expect(folderRunDelayInput(modal)).toHaveValue(`${delayBetweenRequestsMs}`);
    });

    // A result row appears with its loader as soon as the previous request finishes, and keeps
    // spinning through the delay and then its own request. So, per request after the first:
    // observedDelayMs ≈ (time the spinning loader spent) - (the request's own response time).
    const loaderDurationsMs: number[] = [];
    await test.step('Click Run and time each request\'s loader as the results come in one by one', async () => {
      await folderRunButton(modal, 'Run').click();

      for (let index = 1; index < PARENT_REQUESTS.length; index += 1) {
        await runner.resultItemLoader(index).waitFor({ state: 'visible', timeout: 30_000 });
        const loaderShownAt = Date.now();
        await runner.resultStatus().nth(index).waitFor({ state: 'visible', timeout: 30_000 });
        loaderDurationsMs.push(Date.now() - loaderShownAt);
      }

      await runner.runAgainButton().waitFor({ timeout: 30_000 });
      await expect(runner.resultItems()).toHaveCount(PARENT_REQUESTS.length);
      await expect(runner.resultItems()).toContainText(PARENT_REQUESTS);
    });

    await test.step('Subtracting each request\'s response time leaves the configured delay', async () => {
      for (let index = 1; index < PARENT_REQUESTS.length; index += 1) {
        const responseTimeMs = await getRunnerResultResponseTimeMs(page, index);
        // observedDelayMs ≈ (time the spinning loader spent) - (the request's own response time).
        const observedDelayMs = loaderDurationsMs[index - 1] - responseTimeMs;

        expect(observedDelayMs, `delay before "${PARENT_REQUESTS[index]}"`).toBeGreaterThanOrEqual(delayBetweenRequestsMs - toleranceMs);
        expect(observedDelayMs, `delay before "${PARENT_REQUESTS[index]}"`).toBeLessThanOrEqual(delayBetweenRequestsMs + maxOverheadMs);
      }
    });
  });

  test('TC-2676: Verify the include tags run only the requests carrying the tag', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const runner = buildRunnerLocators(page);
    const locators = buildCommonLocators(page);

    const modal = await openFolderRunModal(page, COLLECTION_NAME, ['parent']);
    await clearRunnerTags(page, modal);

    await test.step('Add "smoke" under Include tags', async () => {
      await addRunnerTag(page, 'Include', 'smoke', modal);
    });

    await test.step('The modal counts only the tagged request', async () => {
      await expect(folderRunCount(modal, 'Run')).toContainText('(1 requests)');
    });

    await test.step('Click Run', async () => {
      await folderRunButton(modal, 'Run').click();
      await runner.runAgainButton().waitFor();
    });

    await test.step('Only the request tagged "smoke" ran', async () => {
      await expect(runner.resultItems()).toHaveCount(1);
      await expect(locators.runnerResults.itemPath('first')).toBeVisible();
      await expect(locators.runnerResults.itemPath('first')).toContainText('Tags: smoke');
      await expect(runner.resultStatus()).toHaveText([RUNNER_OK_STATUS]);
    });
  });

  test('TC-2677: Verify the exclude tags skip the requests carrying the tag', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const runner = buildRunnerLocators(page);
    const locators = buildCommonLocators(page);

    const modal = await openFolderRunModal(page, COLLECTION_NAME, ['parent']);
    await clearRunnerTags(page, modal);

    await test.step('Add "smoke" under Exclude tags', async () => {
      await addRunnerTag(page, 'Exclude', 'smoke', modal);
    });

    await test.step('The modal counts only the untagged requests', async () => {
      await expect(folderRunCount(modal, 'Run')).toContainText(`(${PARENT_REQUESTS.length - 1} requests)`);
    });

    await test.step('Click Run', async () => {
      await folderRunButton(modal, 'Run').click();
      await runner.runAgainButton().waitFor();
    });

    await test.step('Only the requests without the "smoke" tag ran', async () => {
      await expect(runner.resultItems()).toHaveCount(PARENT_REQUESTS.length - 1);
      await expect(runner.resultItems()).toContainText(['second', 'third']);
      await expect(locators.runnerResults.itemPath('first')).toHaveCount(0);
      await expect(runner.resultStatus()).toHaveText([RUNNER_OK_STATUS, RUNNER_OK_STATUS]);
    });
  });

  test('TC-2690: Verify the Run Again re-executes the folder on the same dashboard', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const runner = buildRunnerLocators(page);

    const modal = await openFolderRunModal(page, COLLECTION_NAME, ['rerun']);
    await clearRunnerTags(page, modal);

    await test.step('Run the folder; the dashboard appears with Run Again', async () => {
      await folderRunButton(modal, 'Run').click();
      await runner.runAgainButton().waitFor();
      await expect(runner.resultItems()).toHaveCount(1);
      await expect(runner.resultItems()).toContainText(['slow']);
      await expect(runner.resultStatus()).toHaveText([RUNNER_OK_STATUS]);
    });

    await test.step('Click Run Again; the folder runs again on the same dashboard', async () => {
      await runner.runAgainButton().click();
      // the "slow" request keeps the run in flight long enough to observe it
      await expect(runner.cancelExecutionButton()).toBeVisible();
      await expect(runner.runAgainButton()).toBeVisible();
    });

    await test.step('The dashboard reports the re-run', async () => {
      await expect(runner.resultItems()).toHaveCount(1);
      await expect(runner.resultItems()).toContainText(['slow']);
      await expect(runner.resultStatus()).toHaveText([RUNNER_OK_STATUS]);
      await expect(runner.resetButton()).toBeVisible();
    });
  });

  test('TC-2728: Verify the Reset on the dashboard returns to the runner config, where a delay can be set for a new run', { tag: '@sanity' }, async ({
    pageWithUserData: page
  }) => {
    const runner = buildRunnerLocators(page);
    const delayMs = 500;
    // `rerun/slow` holds the run for 1.5s on top of the delays between the other requests.
    const minimumElapsedMs = (TOTAL_REQUESTS_IN_COLLECTION - 1) * delayMs;

    const modal = await openFolderRunModal(page, COLLECTION_NAME, ['parent']);
    await clearRunnerTags(page, modal);

    await test.step('Run the folder and wait for the execution dashboard', async () => {
      await folderRunButton(modal, 'Run').click();
      await runner.runAgainButton().waitFor();
      await expect(runner.resultItems()).toHaveCount(PARENT_REQUESTS.length);
    });

    await test.step('Click Reset; the runner config panel replaces the results', async () => {
      await runner.resetButton().click();
      await expect(runner.configPanel()).toBeVisible();
      await expect(runner.resultItems()).toHaveCount(0);
      await expect(runner.configCounter()).toHaveText(
        `${TOTAL_REQUESTS_IN_COLLECTION} of ${TOTAL_REQUESTS_IN_COLLECTION} selected`,
        { timeout: 30_000 }
      );
    });

    await test.step('Enter a delay between requests', async () => {
      await runner.delayInput().fill(`${delayMs}`);
      await expect(runner.delayInput()).toHaveValue(`${delayMs}`);
    });

    let startedAt = 0;
    await test.step('Click Run (n) requests', async () => {
      await expect(runner.runCollectionButton()).toContainText(`Run ${TOTAL_REQUESTS_IN_COLLECTION} Requests`);
      startedAt = Date.now();
      await runner.runCollectionButton().click();
      await runner.runAgainButton().waitFor();
    });

    await test.step('The new run reports every request and honors the delay', async () => {
      await expect(runner.resultItems()).toHaveCount(TOTAL_REQUESTS_IN_COLLECTION);
      expect(Date.now() - startedAt).toBeGreaterThanOrEqual(minimumElapsedMs);
    });
  });
});
