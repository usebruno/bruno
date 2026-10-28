import { test, expect } from '../../../playwright';
import { closeAllCollections, expandFolder, openCollection } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Insomnia URL import', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-813: imports a valid Insomnia collection from a direct URL', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    // Fetches the collection over the network; the main-process axios timeout is 30s,
    // equal to the default test budget, so a slow fetch is killed before it can
    // fail or succeed. Give the test more room than the fetch it waits on.
    test.setTimeout(60_000);

    const insomniaUrl = 'https://raw.githubusercontent.com/usebruno/bruno/refs/heads/main/tests/import/insomnia/fixtures/insomnia-v5.yaml';
    const locators = buildCommonLocators(page);
    const collectionName = 'Test API Collection v5';

    await test.step('Open import and enter the Insomnia collection URL', async () => {
      await locators.plusMenu.button().click();
      await locators.plusMenu.importCollection().click();
      await locators.import.modal().waitFor({ state: 'visible' });
      await locators.import.urlTab().click();
      await expect(locators.import.urlInput()).toBeVisible();
      await locators.import.urlInput().fill(insomniaUrl);
    });

    await test.step('Import the collection from the URL', async () => {
      await locators.import.urlImportButton().click();
      await locators.import.loader().waitFor({ state: 'hidden' });

      const locationModal = locators.import.locationModal();
      await expect(locationModal.getByText(collectionName)).toBeVisible();
      await locators.import.locationInput().fill(await createTmpDir('test-api-collection-v5'));
      await locators.import.importButton().click();
      await expect(locationModal).toBeHidden();
    });

    await test.step('Imported collection keeps its folders and request', async () => {
      await expect(locators.sidebar.collection(collectionName)).toBeVisible();
      await openCollection(page, collectionName);
      await expect(locators.sidebar.itemsIn(collectionName, 'API Tests')).toBeVisible();
      await expect(locators.sidebar.itemsIn(collectionName, 'Data Management')).toBeVisible();

      await expandFolder(page, 'API Tests');
      await expect(locators.sidebar.itemsIn(collectionName, 'Get Users')).toBeVisible();
      await expect(locators.sidebar.itemsIn(collectionName, 'Authentication')).toBeVisible();
      await expandFolder(page, 'Authentication');

      const loginUser = locators.sidebar.itemsIn(collectionName, 'Login User');
      await expect(loginUser).toBeVisible();
      await loginUser.click();

      await expect(locators.request.methodDropdown()).toContainText('POST');
      await expect(locators.request.urlLine()).toContainText('{{base_url}}/api/auth/login');
    });

    await test.step('Imported collection keeps its environment', async () => {
      await locators.environment.selector().click();
      await locators.environment.collectionTab().click();
      await locators.environment.configureButton().click();
      await locators.environment.sidebarActions.row('Base Environment').click();
      await expect(locators.environment.varRowValueLine('base_url')).toHaveText('https://api.example.com');
      await expect(locators.environment.varRowValueLine('auth_token')).toHaveText('your_auth_token_here');
    });
  });
});
