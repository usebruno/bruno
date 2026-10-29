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
    test.setTimeout(60_000);

    const postmanUrl = 'https://raw.githubusercontent.com/aparna-bruno/bruno/refs/heads/test/postman-url-import-tc-811/tests/import/postman/fixtures/postman-url-import-collection.json';
    const { plusMenu, import: importLocators, request, sidebar, table, auth } = buildCommonLocators(page);
    const collectionName = 'Sunshine Conversations API';

    await test.step('Open import and enter the Postman collection URL', async () => {
      await plusMenu.button().click();
      await plusMenu.importCollection().click();
      await importLocators.modal().waitFor({ state: 'visible' });
      await importLocators.urlTab().click();
      await expect(importLocators.urlInput()).toBeVisible();
      await importLocators.urlInput().fill(postmanUrl);
    });

    await test.step('Import the collection from the URL', async () => {
      await importLocators.urlImportButton().click();
      await importLocators.loader().waitFor({ state: 'hidden' });

      const locationModal = importLocators.locationModal();
      await expect(locationModal.getByText(collectionName)).toBeVisible();
      await importLocators.locationInput().fill(await createTmpDir('sunshine-conversations'));
      await importLocators.importButton().click();
      await expect(locationModal).toBeHidden();
    });

    await test.step('Imported collection keeps its folder and request', async () => {
      await expect(sidebar.collection(collectionName)).toBeVisible();
      await openCollection(page, collectionName);
      await expect(sidebar.itemsIn(collectionName, 'Apps')).toBeVisible();
      await expect(sidebar.itemsIn(collectionName, 'App Keys')).toBeVisible();

      await expandFolder(page, 'Apps');
      const createApp = sidebar.itemsIn(collectionName, 'Create App');
      await expect(createApp).toBeVisible();
      await createApp.click();

      await expect(request.methodDropdown()).toContainText('POST');
      await expect(request.urlLine()).toContainText('{{url}}/v2/apps');
    });

    await test.step('Imported collection keeps its auth and variable', async () => {
      await openCollection(page, collectionName);
      await selectCollectionPaneTab(page, 'auth');
      await expect(auth.modeSelector()).toContainText('Bearer Token');

      await selectCollectionPaneTab(page, 'vars');
      await expect(table('collection-vars-req').rowByName('url')).toContainText('https://{{subdomain}}.zendesk.com/sc');
    });
  });
});
