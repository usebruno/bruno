import { test, expect, Page } from '../../../playwright';
import {
  openRunnerTabWithTagsReady,
  addRunnerTag,
  clearRunnerTags,
  runnerConfigItem
} from '../../utils/page/runner';
import { buildRunnerLocators } from '../../utils/page/index';

const COLLECTION_NAME = 'runner-folder-tags';

/**
 * The fixture mirrors `tests/folder/tags-yml`, so the effective tags the runner filters on are:
 *
 *   untagged                  -> []
 *   own-tagged                -> [smoke]
 *   api/inherits-only         -> [api]
 *   api/own-and-inherited     -> [smoke, api]
 *   api/v2/nested             -> [api, v2]
 *   api/v2/reports-tags       -> [smoke, api, v2]
 *   legacy/inherits-wip       -> [smoke, wip]
 *   misc/plain                -> []
 */
const IN_API_SUBTREE = ['inherits-only', 'own-and-inherited', 'nested', 'reports-tags'];
const OUTSIDE_API_SUBTREE = ['untagged', 'own-tagged', 'inherits-wip', 'plain'];

/**
 * Opens the runner on a clean slate: no tag filters, every request enabled and selected.
 * Both the filters and the selection live in collection state and survive across tests that
 * share an app instance, so each is reset rather than assumed.
 */
const openRunnerWithCleanConfig = async (page: Page) => {
  const locators = buildRunnerLocators(page);
  await openRunnerTabWithTagsReady(page, COLLECTION_NAME, 'untagged');
  await clearRunnerTags(page);
  await locators.configResetButton().click();
  await expect(locators.configCounter()).toHaveText('8 of 8 selected', { timeout: 30000 });
};

test.describe('Runner config panel — folder tags', () => {
  test('includes only the subtree beneath a folder carrying the included tag', async ({
    pageWithUserData: page
  }) => {
    const locators = buildRunnerLocators(page);
    await openRunnerWithCleanConfig(page);

    await addRunnerTag(page, 'Include', 'api');

    await test.step('Only the four requests under api/ stay enabled', async () => {
      await expect(locators.configCounter()).toHaveText('4 of 4 selected');
      for (const name of IN_API_SUBTREE) {
        await expect(runnerConfigItem(page, name)).not.toHaveClass(/is-disabled/);
      }
      for (const name of OUTSIDE_API_SUBTREE) {
        await expect(runnerConfigItem(page, name)).toHaveClass(/is-disabled/);
      }
    });
  });

  test('excludes a whole subtree, reaching requests that only inherit the tag from a grandparent', async ({
    pageWithUserData: page
  }) => {
    const locators = buildRunnerLocators(page);
    await openRunnerWithCleanConfig(page);

    await addRunnerTag(page, 'Exclude', 'api');

    await test.step('Everything under api/ is disabled, two levels deep', async () => {
      await expect(locators.configCounter()).toHaveText('4 of 4 selected');
      for (const name of IN_API_SUBTREE) {
        await expect(runnerConfigItem(page, name)).toHaveClass(/is-disabled/);
      }
      for (const name of OUTSIDE_API_SUBTREE) {
        await expect(runnerConfigItem(page, name)).not.toHaveClass(/is-disabled/);
      }
    });
  });

  test('combines an inherited include with an inherited exclude', async ({ pageWithUserData: page }) => {
    const locators = buildRunnerLocators(page);
    await openRunnerWithCleanConfig(page);

    await addRunnerTag(page, 'Include', 'api');
    await addRunnerTag(page, 'Exclude', 'v2');

    await test.step('The v2 subtree drops out of the api subtree', async () => {
      await expect(locators.configCounter()).toHaveText('2 of 2 selected');
      await expect(runnerConfigItem(page, 'inherits-only')).not.toHaveClass(/is-disabled/);
      await expect(runnerConfigItem(page, 'own-and-inherited')).not.toHaveClass(/is-disabled/);
      await expect(runnerConfigItem(page, 'nested')).toHaveClass(/is-disabled/);
      await expect(runnerConfigItem(page, 'reports-tags')).toHaveClass(/is-disabled/);
    });
  });
});
