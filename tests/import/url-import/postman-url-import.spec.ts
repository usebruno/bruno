import { test, expect } from '../../../playwright';
import * as fs from 'fs';
import * as path from 'path';
import { closeAllCollections, expandFolder, openCollection, selectCollectionPaneTab } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Postman URL import', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-811: Imports a valid Postman collection from a URL via sidebar plus menu', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    // Fetches the collection over the network; the main-process axios timeout is 30s,
    // so a slow fetch is killed before it can fail or succeed. The collection is large,
    // so give the import more room than that fetch.
    test.setTimeout(60_000);

    const postmanUrl = 'https://raw.githubusercontent.com/usebruno/bruno/refs/heads/main/tests/import/postman/fixtures/postman-url-import-collection.json';
    const { plusMenu, import: importLocators, request, sidebar, table, auth } = buildCommonLocators(page);
    const collectionName = 'Sunshine Conversations API';
    const locationModal = importLocators.locationModal();
    const collectionTempDir = await createTmpDir('sunshine-conversations');

    await test.step('Open import collection modal and switch to URL tab', async () => {
      await plusMenu.button().click();
      await plusMenu.importCollection().click();
      await importLocators.modal().waitFor({ state: 'visible' });
      await importLocators.urlTab().click();
    });

    await test.step('Enter the Postman collection URL in the URL input text box', async () => {
      await importLocators.urlInput().waitFor({ state: 'visible' });
      await importLocators.urlInput().fill(postmanUrl);
    });

    await test.step('Import the collection from the URL', async () => {
      await importLocators.urlImportButton().click();
      await importLocators.loader().waitFor({ state: 'hidden' });
      await locationModal.getByText(collectionName).waitFor({ state: 'visible' });
      await importLocators.locationInput().fill(collectionTempDir);
      await importLocators.importButton().click();
      await locationModal.waitFor({ state: 'hidden' });
    });

    await test.step('Verify that Imported collection keeps its folder and request', async () => {
      await expect(sidebar.collection(collectionName)).toBeVisible();

      await openCollection(page, collectionName);
      await expect(sidebar.itemsIn(collectionName, 'Apps')).toBeVisible();
      await expect(sidebar.itemsIn(collectionName, 'App Keys')).toBeVisible();

      await expandFolder(page, 'Apps');

      const createAppRequest = sidebar.itemsIn(collectionName, 'Create App');
      await expect(createAppRequest).toBeVisible();
      await createAppRequest.click();

      await expect(request.methodDropdown()).toContainText('POST');
      await expect(request.urlLine()).toContainText('{{url}}/v2/apps');
    });

    await test.step('Verify that Imported collection keeps its auth and variable', async () => {
      await openCollection(page, collectionName);
      await selectCollectionPaneTab(page, 'auth');
      await expect(auth.modeSelector()).toContainText('Bearer Token');

      await selectCollectionPaneTab(page, 'vars');
      await expect(table('collection-vars-req').rowByName('url')).toContainText('https://{{subdomain}}.zendesk.com/sc');
    });

    await test.step('Verify the imported collection and request are saved as YAML', async () => {
      const collectionDir = path.join(collectionTempDir, collectionName);

      await expect.poll(() => fs.existsSync(path.join(collectionDir, 'opencollection.yml'))).toBe(true);
      expect(fs.existsSync(path.join(collectionDir, 'Apps', 'Create App.yml'))).toBe(true);
    });
  });
});
