import { test, expect } from '../../../playwright';
import {
  addRunnerTag,
  buildCommonLocators,
  buildRunnerLocators,
  buildSidebarLocators,
  getTotalRequestsDuration,
  resetCollectionRunnerResults
} from '../../utils/page';

const collectionName = 'collection-run';
const plainRequest = 'Ping Without Tag';
const smokeRequest = 'Ping With Smoke Tag';

test.describe('Collection runner', () => {
  // Clears the previous test's run so the next one still sees the runner setup screen.
  test.afterEach(async ({ pageWithUserData: page }) => {
    await resetCollectionRunnerResults(page);
  });

  test('TC-3072: Verify that the user is able to execute all the request which are under the Collection using Run',
    { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
      const runner = buildRunnerLocators(page);
      const runButton = runner.runCollectionButton();
      const sidebar = buildSidebarLocators(page);
      const menu = sidebar.rowMenu(collectionName, 'collection');

      await test.step(`Open run from the ${collectionName} collection menu`, async () => {
        await sidebar.collectionRow(collectionName).hover();
        await menu.trigger().click();
        await menu.item('run').click();
        await runner.configPanel().waitFor({ state: 'visible' });
      });

      await test.step('Verify the run button text', async () => {
        await expect(runButton).toHaveText('Run 2 Requests');
      });

      await test.step('Run the collection and verify the requests are executed', async () => {
        await runButton.click();
        // Run Again appears only after the whole collection run finishes
        await runner.runAgainButton().waitFor();

        await expect(runner.allCount()).toHaveText('2');
        await expect(runner.passedCount()).toHaveText('2');
      });
    });

  test('TC-3071: Verify the delay between requests execution in the Collection run', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const delayCollectionName = 'delay-run';
    const delayMs = 2000;
    const requestCount = 2;
    const runner = buildRunnerLocators(page);
    const runButton = runner.runCollectionButton();
    const sidebar = buildSidebarLocators(page);
    const menu = sidebar.rowMenu(delayCollectionName, 'collection');

    await test.step(`Open run from the ${delayCollectionName} collection menu`, async () => {
      await sidebar.collectionRow(delayCollectionName).hover();
      await menu.trigger().click();
      await menu.item('run').click();
      await runner.configPanel().waitFor({ state: 'visible' });
      await runner.delayInput().fill(String(delayMs));
    });

    await test.step('Verify delay and run button texts', async () => {
      await expect(runner.delayInput()).toHaveValue(String(delayMs));
      await expect(runButton).toHaveText(`Run ${requestCount} Requests`);
    });

    await test.step('Run the collection and verify the total delay apart from the request time', async () => {
      const startedAt = Date.now();
      await runButton.click();
      // Run Again appears only after the whole collection run finishes
      await runner.runAgainButton().waitFor();
      const elapsedMs = Date.now() - startedAt;

      // The delay runs between requests, never before the first. Subtract each response time so only those waits remain.
      const requestTimeMs = await getTotalRequestsDuration(page, requestCount);
      const totalDelaySeconds = Math.floor((elapsedMs - requestTimeMs) / 1000);

      expect(totalDelaySeconds).toBe(((requestCount - 1) * delayMs) / 1000);
    });
  });

  test('TC-3070: Verify the include tags functionality under Collection Run',
    { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
      const tag = 'smoke';
      const { runnerResults } = buildCommonLocators(page);
      const runner = buildRunnerLocators(page);
      const runButton = runner.runCollectionButton();
      const sidebar = buildSidebarLocators(page);
      const menu = sidebar.rowMenu(collectionName, 'collection');

      await test.step(`Open run from the ${collectionName} menu row item`, async () => {
        await sidebar.collectionRow(collectionName).hover();
        await menu.trigger().click();
        await menu.item('run').click();
        await runner.configPanel().waitFor({ state: 'visible' });
      });

      await addRunnerTag(page, 'Include', tag);

      await test.step('verify the run button text', async () => {
        await expect(runButton).toHaveText('Run 1 Request');
      });

      await test.step('Run the collection and verify only the tagged request ran', async () => {
        await runButton.click();
        // Run Again appears only after the whole collection run finishes
        await runner.runAgainButton().waitFor();

        await expect(runnerResults.itemPath(plainRequest)).toHaveCount(0);
        await expect(runner.allCount()).toHaveText('1');
        await expect(runner.passedCount()).toHaveText('1');
      });
    });

  test('TC-3069: Verify the exclude tags functionality under Collection Run', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const tag = 'smoke';
    const { runnerResults } = buildCommonLocators(page);
    const runner = buildRunnerLocators(page);
    const runButton = runner.runCollectionButton();
    const sidebar = buildSidebarLocators(page);
    const menu = sidebar.rowMenu(collectionName, 'collection');

    await test.step(`Open run from the ${collectionName} menu row item`, async () => {
      await sidebar.collectionRow(collectionName).hover();
      await menu.trigger().click();
      await menu.item('run').click();
      await runner.configPanel().waitFor({ state: 'visible' });
    });

    await addRunnerTag(page, 'Exclude', tag);

    await test.step('verify the run button text', async () => {
      await expect(runButton).toHaveText('Run 1 Request');
    });

    await test.step('Run the collection and verify the tagged request was left out', async () => {
      await runButton.click();
      // Run Again appears only after the whole collection run finishes
      await runner.runAgainButton().waitFor();

      await expect(runnerResults.itemPath(smokeRequest)).toHaveCount(0);
      await expect(runner.allCount()).toHaveText('1');
      await expect(runner.passedCount()).toHaveText('1');
    });
  });

  test('TC-847: Verify passed filter shows only passed requests with their passed tests', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const skippedCollectionName = 'skipped-run';
    const { runnerResults } = buildCommonLocators(page);
    const runner = buildRunnerLocators(page);
    const runButton = runner.runCollectionButton();
    const sidebar = buildSidebarLocators(page);
    const menu = sidebar.rowMenu(skippedCollectionName, 'collection');

    await test.step(`Open run from the ${skippedCollectionName} menu row item`, async () => {
      await sidebar.collectionRow(skippedCollectionName).hover();
      await menu.trigger().click();
      await menu.item('run').click();
      await runner.configPanel().waitFor({ state: 'visible' });
    });

    await test.step('Verify the run button text', async () => {
      await expect(runButton).toHaveText('Run 4 Requests');
    });

    await test.step('Run the collection from the runner tab and verify the requests are executed', async () => {
      await runButton.click();
      // Run Again appears only after the whole collection run finishes
      await runner.runAgainButton().waitFor();

      await expect(runner.allCount()).toHaveText('4');
      await expect(runner.passedCount()).toHaveText('2');
    });

    await test.step('Verify the passed tab shows only the passed requests and their passed tests', async () => {
      await runner.filterButton('passed').click();

      await expect(runner.passedCount()).toHaveText('2');
      await expect(runner.resultItems()).toHaveCount(2);
      await expect(runner.passedTestRows()).toHaveCount(2);
      await expect(runnerResults.itemPath('First Passed Ping')).toHaveCount(1);
      await expect(runnerResults.itemPath('Second Passed Ping')).toHaveCount(1);
    });
  });

  test('TC-850: Verify skipped filter shows only skipped requests', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const skippedCollectionName = 'skipped-run';
    const { runnerResults } = buildCommonLocators(page);
    const runner = buildRunnerLocators(page);
    const runButton = runner.runCollectionButton();
    const sidebar = buildSidebarLocators(page);
    const menu = sidebar.rowMenu(skippedCollectionName, 'collection');

    await test.step(`Open run from the ${skippedCollectionName} menu row item`, async () => {
      await sidebar.collectionRow(skippedCollectionName).hover();
      await menu.trigger().click();
      await menu.item('run').click();
      await runner.configPanel().waitFor({ state: 'visible' });
    });

    await test.step('Verify the run button text', async () => {
      await expect(runButton).toHaveText('Run 4 Requests');
    });

    await test.step('Run the collection', async () => {
      await runButton.click();
      // Run Again appears only after the whole collection run finishes
      await runner.runAgainButton().waitFor();

      await expect(runner.allCount()).toHaveText('4');
      await expect(runner.skippedCount()).toHaveText('2');
    });

    await test.step('Verify the skipped tab shows only the skipped requests', async () => {
      await runner.filterButton('skipped').click();

      await expect(runner.skippedCount()).toHaveText('2');
      await expect(runner.resultItems()).toHaveCount(2);
      await expect(runnerResults.itemPath('First Skipped Ping')).toHaveCount(1);
      await expect(runnerResults.itemPath('Second Skipped Ping')).toHaveCount(1);
    });
  });
});
