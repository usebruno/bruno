import { test, expect } from '../../../playwright';
import {
  openFolderRunModal,
  folderRunButton,
  folderRunCount,
  dismissFolderRunModal,
  addRunnerTag,
  clearRunnerTags,
  buildRunnerLocators
} from '../../utils/page/runner';
import { buildCommonLocators } from '../../utils/page/locators';

const COLLECTION_NAME = 'runner-folder-tags';

test.describe('Folder run modal — folder tags', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await dismissFolderRunModal(page);
  });

  test('counts only the requests a nested folder tag reaches', async ({ pageWithUserData: page }) => {
    const modal = await openFolderRunModal(page, COLLECTION_NAME, ['api']);
    await clearRunnerTags(page, modal);

    await test.step('Unfiltered, the folder offers its own two and four recursively', async () => {
      await expect(folderRunCount(modal, 'Run')).toContainText('(2 requests)');
      await expect(folderRunCount(modal, 'Recursive Run')).toContainText('(4 requests)');
    });

    await addRunnerTag(page, 'Include', 'v2', modal);

    await test.step('Filtering on the child folder\'s tag empties the non-recursive run', async () => {
      await expect(folderRunCount(modal, 'Run')).toContainText('(0 requests)');
      await expect(folderRunButton(modal, 'Run')).toBeDisabled();

      await expect(folderRunCount(modal, 'Recursive Run')).toContainText('(2 requests)');
      await expect(folderRunButton(modal, 'Recursive Run')).toBeEnabled();
    });
  });

  test('keeps inheriting tags from folders above the one being run', async ({ pageWithUserData: page }) => {
    test.setTimeout(120_000);
    const locators = buildCommonLocators(page);
    const runner = buildRunnerLocators(page);

    const modal = await openFolderRunModal(page, COLLECTION_NAME, ['api', 'v2']);
    await clearRunnerTags(page, modal);
    await addRunnerTag(page, 'Include', 'api', modal);

    await test.step('"api" is inherited from the parent folder, not carried by v2 or its requests', async () => {
      await expect(folderRunCount(modal, 'Run')).toContainText('(2 requests)');
      await expect(folderRunCount(modal, 'Recursive Run')).toContainText('(2 requests)');
    });

    await test.step('Running the folder executes both of them', async () => {
      await folderRunButton(modal, 'Recursive Run').click();
      await runner.runAgainButton().waitFor({ timeout: 60_000 });

      await expect(runner.resultItems()).toHaveCount(2);
      await expect(locators.runnerResults.itemPath('nested')).toBeVisible();
      await expect(locators.runnerResults.itemPath('reports-tags')).toBeVisible();
    });
  });
});
