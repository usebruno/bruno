import { test, expect } from '../../../playwright';
import * as fs from 'fs';
import * as path from 'path';
import { closeAllCollections, expandFolder, openCollection } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Insomnia URL import', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-813: imports a valid Insomnia collection from a direct URL', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    // Fetches the collection over the network; the main-process axios timeout is 30s,
    // so a slow fetch is killed before it can fail or succeed. The collection is large,
    // so give the import more room than that fetch.
    test.setTimeout(60_000);

    const insomniaUrl = 'https://raw.githubusercontent.com/usebruno/bruno/refs/heads/main/tests/import/insomnia/fixtures/insomnia-v5.yaml';
    const { plusMenu, import: importLocators, request, sidebar, environment } = buildCommonLocators(page);
    const collectionName = 'Test API Collection v5';
    const locationModal = importLocators.locationModal();
    const collectionTempDir = await createTmpDir('test-api-collection-v5');

    await test.step('Open import collection modal and switch to URL tab', async () => {
      await plusMenu.button().click();
      await plusMenu.importCollection().click();
      await importLocators.modal().waitFor({ state: 'visible' });
      await importLocators.urlTab().click();
    });

    await test.step('Enter the Insomnia collection URL in the URL input text box', async () => {
      await importLocators.urlInput().waitFor({ state: 'visible' });
      await importLocators.urlInput().fill(insomniaUrl);
    });

    await test.step('Import the collection from the URL', async () => {
      await importLocators.urlImportButton().click();
      await importLocators.loader().waitFor({ state: 'hidden' });

      await locationModal.getByText(collectionName).waitFor({ state: 'visible' });
      await importLocators.locationInput().fill(collectionTempDir);
      await importLocators.importButton().click();
      await locationModal.waitFor({ state: 'hidden' });
    });

    await test.step('Verify that Imported collection keeps its folders and request', async () => {
      await expect(sidebar.collection(collectionName)).toBeVisible();

      await openCollection(page, collectionName);
      await expect(sidebar.itemsIn(collectionName, 'API Tests')).toBeVisible();
      await expect(sidebar.itemsIn(collectionName, 'Data Management')).toBeVisible();

      await expandFolder(page, 'API Tests');

      await expect(sidebar.itemsIn(collectionName, 'Get Users')).toBeVisible();
      await expect(sidebar.itemsIn(collectionName, 'Authentication')).toBeVisible();
      await expandFolder(page, 'Authentication');

      const loginUser = sidebar.itemsIn(collectionName, 'Login User');
      await expect(loginUser).toBeVisible();
      await loginUser.click();

      await expect(request.methodDropdown()).toContainText('POST');
      await expect(request.urlLine()).toContainText('{{base_url}}/api/auth/login');
    });

    await test.step('Verify that Imported collection keeps its environment', async () => {
      await environment.selector().click();
      await environment.collectionTab().click();
      await environment.configureButton().click();
      await environment.sidebarActions.row('Base Environment').click();
      await expect(environment.varRowValueLine('base_url')).toHaveText('https://api.example.com');
      await expect(environment.varRowValueLine('auth_token')).toHaveText('your_auth_token_here');
    });

    await test.step('Verify the imported collection and request are saved as YAML', async () => {
      const collectionDir = path.join(collectionTempDir, collectionName);

      await expect.poll(() => fs.existsSync(path.join(collectionDir, 'opencollection.yml'))).toBe(true);
      expect(fs.existsSync(path.join(collectionDir, 'API Tests', 'Authentication', 'Login User.yml'))).toBe(true);
    });
  });
});
