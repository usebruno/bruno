import { test, expect } from '../../../playwright';
import {
  addRunnerTag,
  buildCommonLocators,
  buildRunnerLocators
} from '../../utils/page';

const collectionName = 'collection-run';
const plainRequest = 'Ping Without Tag';
const smokeRequest = 'Ping With Smoke Tag';

test.describe('Collection runner', () => {
  // Clears the previous test's run so the next one still sees the runner setup screen.
  test.beforeEach(async ({ pageWithUserData: page }) => {
    const reset = buildRunnerLocators(page).resetButton();
    if (await reset.count() === 1) { await reset.click(); }
  });

  test('TC-3072: Verify that the user is able to execute all the request which are under the Collection using Run',
    { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
      const { sidebar, runnerResults } = buildCommonLocators(page);
      const runner = buildRunnerLocators(page);
      const runButton = runner.runCollectionButton();

      await test.step('Open Run from the collection item row menu', async () => {
        const menu = sidebar.rowMenu(collectionName, 'collection');
        await sidebar.collectionRow(collectionName).hover();
        await menu.trigger().click();
        await menu.item('run').click();

        await expect(runner.configPanel()).toBeVisible();
        await expect(runButton).toHaveText('Run 2 Requests');
      });

      await test.step('Run the collection from the Runner tab and verify the requests are executed', async () => {
        await runButton.click();

        await expect(runnerResults.itemPath(plainRequest)).toContainText('200');
        await expect(runnerResults.itemPath(smokeRequest)).toContainText('200');
        await expect(runner.allCount()).toHaveText('2');
        await expect(runner.passedCount()).toHaveText('2');
        await expect(runner.failedCount()).toHaveText('0');
      });
    });

  test('TC-3071: Verify the delay between requests execution in the Collection run', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const delayMs = 2000;
    const { sidebar, runnerResults } = buildCommonLocators(page);
    const runner = buildRunnerLocators(page);

    await test.step('Open Run from the collection menu and set the delay between requests', async () => {
      const menu = sidebar.rowMenu(collectionName, 'collection');
      await sidebar.collectionRow(collectionName).hover();
      await menu.trigger().click();
      await menu.item('run').click();
      await runner.delayInput().fill(String(delayMs));

      await expect(runner.configPanel()).toBeVisible();
      await expect(runner.delayInput()).toHaveValue(String(delayMs));
    });

    await test.step('Run the collection from the Runner tab and verify the requests are executed', async () => {
      const startedAt = Date.now();
      await runner.runCollectionButton().click();
      await runner.runAgainButton().waitFor();

      await expect(Date.now() - startedAt).toBeGreaterThanOrEqual(delayMs * 2);
      await expect(runnerResults.itemPath(plainRequest)).toContainText('200');
      await expect(runnerResults.itemPath(smokeRequest)).toContainText('200');
      await expect(runner.allCount()).toHaveText('2');
      await expect(runner.passedCount()).toHaveText('2');
      await expect(runner.failedCount()).toHaveText('0');
    });
  });

  test('TC-3070: Verify the Include Tags functionality under Collection Run', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const tag = 'smoke';
    const { sidebar, runnerResults } = buildCommonLocators(page);
    const runner = buildRunnerLocators(page);
    const runButton = runner.runCollectionButton();

    await test.step('Open Run from the collection menu', async () => {
      const menu = sidebar.rowMenu(collectionName, 'collection');
      await sidebar.collectionRow(collectionName).hover();
      await menu.trigger().click();
      await menu.item('run').click();

      await expect(runner.configPanel()).toBeVisible();
    });

    await test.step('Add Include tag on the collection runner config panel', async () => {
      await addRunnerTag(page, 'Include', tag);

      await expect(runButton).toHaveText('Run 1 Request');
    });

    await test.step('Run the collection and verify only the tagged request ran', async () => {
      await runButton.click();

      await expect(runnerResults.itemPath(smokeRequest)).toContainText('200');
      await expect(runnerResults.itemPath(plainRequest)).toHaveCount(0);
      await expect(runner.allCount()).toHaveText('1');
      await expect(runner.passedCount()).toHaveText('1');
      await expect(runner.failedCount()).toHaveText('0');
    });
  });

  test('TC-3069: Verify the Exclude Tags functionality under Collection Run', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const tag = 'smoke';
    const { sidebar, runnerResults } = buildCommonLocators(page);
    const runner = buildRunnerLocators(page);
    const runButton = runner.runCollectionButton();

    await test.step('Open Run from the collection menu', async () => {
      const menu = sidebar.rowMenu(collectionName, 'collection');
      await sidebar.collectionRow(collectionName).hover();
      await menu.trigger().click();
      await menu.item('run').click();

      await expect(runner.configPanel()).toBeVisible();
    });

    await test.step('Add Exclude tag on the collection runner config panel', async () => {
      await addRunnerTag(page, 'Exclude', tag);

      await expect(runButton).toHaveText('Run 1 Request');
    });

    await test.step('Run the collection and verify the tagged request was left out', async () => {
      await runButton.click();

      await expect(runnerResults.itemPath(plainRequest)).toContainText('200');
      await expect(runnerResults.itemPath(smokeRequest)).toHaveCount(0);
      await expect(runner.allCount()).toHaveText('1');
      await expect(runner.passedCount()).toHaveText('1');
      await expect(runner.failedCount()).toHaveText('0');
    });
  });

  test('TC-847: Verify Passed Filter Shows Only Passed Requests with Their Passed Tests', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const skippedCollectionName = 'skipped-run';
    const { sidebar } = buildCommonLocators(page);
    const runner = buildRunnerLocators(page);
    const runButton = runner.runCollectionButton();

    await test.step('Open Run from the collection item row menu and verify the run button text', async () => {
      const menu = sidebar.rowMenu(skippedCollectionName, 'collection');
      await sidebar.collectionRow(skippedCollectionName).hover();
      await menu.trigger().click();
      await menu.item('run').click();

      await expect(runner.configPanel()).toBeVisible();
      await expect(runButton).toHaveText('Run 4 Requests');
    });

    await test.step('Run the collection from the Runner tab and verify the requests are executed', async () => {
      await runButton.click();
      await runner.runAgainButton().waitFor();

      await expect(runner.allCount()).toHaveText('4');
      await expect(runner.passedCount()).toHaveText('2');
    });

    await test.step('Verify the passed tab shows only the passed requests and their passed tests', async () => {
      await runner.filterButton('passed').click();

      await expect(runner.passedCount()).toHaveText('2');
      await expect(runner.resultItems()).toHaveCount(2);
      await expect(runner.passedTestRows()).toHaveCount(2);
    });
  });

  test('TC-850: Verify Skipped Filter Shows Only Skipped Requests', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const skippedCollectionName = 'skipped-run';
    const { sidebar } = buildCommonLocators(page);
    const runner = buildRunnerLocators(page);
    const runButton = runner.runCollectionButton();

    await test.step('Open Run from the collection menu and verify the run button text', async () => {
      const menu = sidebar.rowMenu(skippedCollectionName, 'collection');
      await sidebar.collectionRow(skippedCollectionName).hover();
      await menu.trigger().click();
      await menu.item('run').click();

      await expect(runner.configPanel()).toBeVisible();
      await expect(runButton).toHaveText('Run 4 Requests');
    });

    await test.step('Run the collection', async () => {
      await runButton.click();
      await runner.runAgainButton().waitFor();

      await expect(runner.allCount()).toHaveText('4');
      await expect(runner.skippedCount()).toHaveText('2');
    });

    await test.step('Verify the skipped tab shows only the skipped requests', async () => {
      await runner.filterButton('skipped').click();

      await expect(runner.skippedCount()).toHaveText('2');
      await expect(runner.resultItems()).toHaveCount(2);
    });
  });
});
