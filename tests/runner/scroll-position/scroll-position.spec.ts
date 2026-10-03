import { test, expect } from '../../../playwright';
import { buildCommonLocators, buildRunnerLocators, scrollRunnerResults } from '../../utils/page';

const collectionName = 'Runner Scroll Position';

test.describe('Runner results scroll position', () => {
  test.beforeEach(async ({ pageWithUserData: page }) => {
    await test.step('Start from a fresh completed collection run', async () => {
      const { sidebar, collectionHeader } = buildCommonLocators(page);
      const runner = buildRunnerLocators(page);
      await sidebar.collection(collectionName).click();
      await sidebar.request('ping').click();
      await collectionHeader.runner().click();
      await expect(runner.runCollectionButton().or(runner.resultsResetButton())).toBeVisible();
      if (await runner.resultsResetButton().isVisible()) {
        await runner.resultsResetButton().click();
      }
      await runner.runCollectionButton().click();
      await expect(runner.runAgainButton()).toBeVisible();
      await expect(runner.passedTestRows()).toHaveCount(80);
    });
  });

  for (const fraction of [0, 0.4]) {
    test(`preserves a completed run's scroll position at ${fraction * 100}% after switching tabs`, async ({ pageWithUserData: page }) => {
      const { sidebar } = buildCommonLocators(page);
      const runner = buildRunnerLocators(page);

      await test.step('Complete a run with enough test results to scroll', async () => {
        await expect(runner.passedTestRows()).toHaveCount(80);
        await expect.poll(() => runner.resultsBody().evaluate((node) => node.scrollHeight - node.clientHeight)).toBeGreaterThan(0);
      });

      const scrollTop = await scrollRunnerResults(page, fraction);
      await expect.poll(() => runner.resultsBody().evaluate((node) => node.scrollTop)).toBe(scrollTop);

      await test.step('Open a request and return to the runner', async () => {
        await sidebar.request('ping').click();
        await expect(runner.resultsBody()).toBeHidden();
        await runner.tab().click();
        await expect(runner.resultsBody()).toBeVisible();
        await expect.poll(() => runner.resultsBody().evaluate((node) => node.scrollTop)).toBe(scrollTop);
      });

      await test.step('Returning again keeps the restored position', async () => {
        await sidebar.request('ping').click();
        await expect(runner.resultsBody()).toBeHidden();
        await runner.tab().click();
        await expect.poll(() => runner.resultsBody().evaluate((node) => node.scrollTop)).toBe(scrollTop);
      });
    });
  }

  test('Run Again resumes automatic scrolling after reviewing earlier results', async ({ pageWithUserData: page }) => {
    const runner = buildRunnerLocators(page);

    await expect(runner.passedTestRows()).toHaveCount(80);
    await scrollRunnerResults(page, 0);
    await expect.poll(() => runner.resultsBody().evaluate((node) => node.scrollTop)).toBe(0);

    await test.step('Run the collection again and follow the new results', async () => {
      await runner.runAgainButton().click();
      await expect(runner.cancelExecutionButton()).toBeVisible();
      await expect(runner.runAgainButton()).toBeVisible();
      await expect(runner.passedTestRows()).toHaveCount(80);
      await expect.poll(() => runner.resultsBody().evaluate((node) => node.scrollHeight - node.clientHeight - node.scrollTop)).toBeLessThanOrEqual(15);
    });
  });
});
