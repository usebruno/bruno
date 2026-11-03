import { test, expect } from '../../../playwright';
import { closeAllCollections, openRunnerTab, buildRunnerLocators } from '../../utils/page';

test.describe('Collection Runner', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('Cancelling an in-progress run clears the request loader and marks it Cancelled', async ({
    pageWithUserData: page
  }) => {
    const collectionName = 'Runner Cancel Collection';
    const locators = buildRunnerLocators(page);

    await test.step('Start the collection run and confirm a request is in progress', async () => {
      await openRunnerTab(page, collectionName);
      const runButton = locators.runCollectionButton();
      await expect(runButton).toBeEnabled();
      await runButton.click();
      await expect(locators.requestLoader()).toHaveCount(1);
    });

    await test.step('Cancel the run while it is still in progress', async () => {
      const cancelButton = locators.cancelExecutionButton();
      await expect(cancelButton).toBeVisible();
      await cancelButton.click();
    });

    await test.step('Verify the loader stops and the status shows "Cancelled"', async () => {
      await expect(locators.requestLoader()).toHaveCount(0);
      await expect(locators.requestStatusLabel()).toHaveText('canceled');
    });
  });
});
