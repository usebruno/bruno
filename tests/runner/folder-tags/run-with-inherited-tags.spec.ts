import { test, expect } from '../../../playwright';
import { openRunnerTabWithTagsReady, addRunnerTag, clearRunnerTags, buildRunnerLocators } from '../../utils/page/runner';
import { buildCommonLocators } from '../../utils/page/locators';

const COLLECTION_NAME = 'runner-folder-tags';

/** The four requests under api/, all of which carry "api" — two of them only by inheritance. */
const EXPECTED_RESULTS = ['inherits-only', 'own-and-inherited', 'nested', 'reports-tags'];

test.describe('Runner run — folder tags', () => {
  test('runs exactly the tagged subtree and reports the inherited tag on each result', async ({
    pageWithUserData: page
  }) => {
    test.setTimeout(120_000);
    const locators = buildCommonLocators(page);
    const runner = buildRunnerLocators(page);

    await openRunnerTabWithTagsReady(page, COLLECTION_NAME, 'untagged');
    await clearRunnerTags(page);
    await runner.configResetButton().click();
    await expect(runner.configCounter()).toHaveText('8 of 8 selected', { timeout: 30_000 });

    await addRunnerTag(page, 'Include', 'api');
    await expect(runner.configCounter()).toHaveText('4 of 4 selected');

    await test.step('Run the filtered selection', async () => {
      await expect(runner.runCollectionButton()).toContainText('Run 4 Requests');
      await runner.runCollectionButton().click();
      await runner.runAgainButton().waitFor({ timeout: 60_000 });
    });

    await test.step('Only the api subtree ran', async () => {
      await expect(runner.resultItems()).toHaveCount(EXPECTED_RESULTS.length);
      for (const name of EXPECTED_RESULTS) {
        await expect(locators.runnerResults.itemPath(name)).toBeVisible();
      }
    });

    await test.step('Each result reports "api", including the requests that only inherit it', async () => {
      for (const name of EXPECTED_RESULTS) {
        await expect(locators.runnerResults.itemPath(name)).toContainText('Tags: api');
      }
    });
  });
});
