import { test, expect } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';

const COLLECTION_NAME = 'GenerateDocsOrder';

// Kept in its own spec file so the app starts fresh: at startup only the last active
// collection is mounted, and this test needs a collection that has never been opened.
test.describe('Generate Documentation from collection settings', () => {
  test('includes every request when settings are opened from the context menu of a collection that was never expanded', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);

    await test.step('Open Settings from the collection context menu without expanding the collection', async () => {
      await locators.sidebar.collection(COLLECTION_NAME).hover();
      await locators.actions.collectionActions(COLLECTION_NAME).click();
      await locators.dropdown.item('Settings').click();
    });

    await test.step('The Overview counts the requests on disk', async () => {
      // The fixture has 5 requests: Lion, Bear, Parrot, ReqAlpha and ReqBeta.
      await expect(locators.paneTabs.overviewRequestCount()).toHaveText('5 requests in collection');
    });

    await test.step('Generate Docs from the Overview covers the same requests', async () => {
      await locators.generateDocs.overviewLink().click();
      await expect(locators.generateDocs.modal()).toBeVisible();
      await expect(locators.generateDocs.versionCounts()).toContainText('5 requests');

      await locators.generateDocs.cancelButton().click();
      await expect(locators.generateDocs.modal()).toBeHidden();
    });
  });
});
