import { test, expect } from '../../../playwright';
import { closeAllCollections, expandFolder, openCollection, selectCollectionPaneTab } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Postman URL import', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-811: imports a valid Postman collection from a direct URL', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    // Fetches the collection over the network; the main-process axios timeout is 30s,
    // so a slow fetch is killed before it can fail or succeed. The collection is large,
    // so give the import more room than that fetch.
    test.setTimeout(120_000);

    const postmanUrl = 'https://docs.smooch.io/sunco-openapi/postman_collection.json';
    const locators = buildCommonLocators(page);
    const collectionName = 'Sunshine Conversations API';

    await test.step('Open import and enter the Postman collection URL', async () => {
      await locators.plusMenu.button().click();
      await locators.plusMenu.importCollection().click();
      await locators.import.modal().waitFor({ state: 'visible' });
      await locators.import.urlTab().click();
      await expect(locators.import.urlInput()).toBeVisible();
      await locators.import.urlInput().fill(postmanUrl);
    });

    await test.step('Import the collection from the URL', async () => {
      await locators.import.urlImportButton().click();
      await locators.import.loader().waitFor({ state: 'hidden' });

      const locationModal = locators.import.locationModal();
      await expect(locationModal.getByText(collectionName)).toBeVisible();
      await locators.import.locationInput().fill(await createTmpDir('sunshine-conversations'));
      await locators.import.importButton().click();
      await expect(locationModal).toBeHidden();
    });

    await test.step('Imported collection keeps its folder and request', async () => {
      await expect(locators.sidebar.collection(collectionName)).toBeVisible();
      await openCollection(page, collectionName);
      await expect(locators.sidebar.itemsIn(collectionName, 'Apps')).toBeVisible();
      await expect(locators.sidebar.itemsIn(collectionName, 'App Keys')).toBeVisible();

      await expandFolder(page, 'Apps');
      const createApp = locators.sidebar.itemsIn(collectionName, 'Create App');
      await expect(createApp).toBeVisible();
      await createApp.click();

      await expect(locators.request.methodDropdown()).toContainText('POST');
      await expect(locators.request.urlLine()).toContainText('{{url}}/v2/apps');
    });

    await test.step('Imported collection keeps its auth and variable', async () => {
      await openCollection(page, collectionName);
      await selectCollectionPaneTab(page, 'auth');
      await expect(locators.auth.modeSelector()).toContainText('Bearer Token');

      await selectCollectionPaneTab(page, 'vars');
      await expect(locators.table('collection-vars-req').rowByName('url')).toContainText('https://{{subdomain}}.zendesk.com/sc');
    });
  });
});
