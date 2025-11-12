import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Create GraphQL Requests', () => {
  let locators: ReturnType<typeof buildCommonLocators>;

  test.beforeAll(async ({ pageWithUserData: page }) => {
    locators = buildCommonLocators(page);
  });

  test.afterAll(async ({ pageWithUserData: page }) => {
    // Clean up Root GraphQL Request
    await locators.sidebar.request('Root GraphQL Request').hover();
    await locators.actions.collectionItemActions('Root GraphQL Request').click();
    await locators.dropdown.item('Delete').click();
    await locators.modal.button('Delete').click();

    // Clean up Folder GraphQL Request
    await locators.sidebar.request('Folder GraphQL Request').hover();
    await locators.actions.collectionItemActions('Folder GraphQL Request').click();
    await locators.dropdown.item('Delete').click();
    await locators.modal.button('Delete').click();

    // Clean up collection
    await closeAllCollections(page);
  });

  test('Verifies that GraphQL requests are created at the expected locations', async ({ pageWithUserData: page }) => {
    await test.step('Navigate to collection and verify it exists', async () => {
      await expect(locators.sidebar.collection('create-requests')).toBeVisible();
    });

    await test.step('Create GraphQL request via collection three dots menu', async () => {
      await locators.sidebar.collection('create-requests').hover();
      await locators.actions.collectionActions('create-requests').click();
      await locators.dropdown.item('New Request').click();

      await page.getByTestId('graphql-request').click();
      await page.getByTestId('request-name').fill('Root GraphQL Request');
      await page.getByTestId('new-request-url').locator('.CodeMirror').click();
      await page.keyboard.type('https://api.example.com/graphql');
      await locators.modal.button('Create').click();
    });

    await test.step('Verify GraphQL request was created at collection root', async () => {
      // Open collection and verify request is present in collection root
      await locators.sidebar.collection('create-requests').click();
      const requestItem = locators.sidebar.request('Root GraphQL Request');
      await expect(requestItem).toBeVisible();

      // Open request and verify it is the active request
      await requestItem.click();
      await expect(locators.tabs.activeRequestTab()).toContainText('Root GraphQL Request');

      // Open folder1 and verify request is not in folder1
      await locators.sidebar.folder('folder1').click();
      const folderRequestItem = locators.sidebar.folderRequest('folder1', 'Root GraphQL Request');
      await expect(folderRequestItem).not.toBeVisible();
    });

    await test.step('Create GraphQL request via folder1 three dots menu', async () => {
      await locators.sidebar.folder('folder1').hover();
      await locators.actions.collectionItemActions('folder1').click();
      await locators.dropdown.item('New Request').click();

      await page.getByTestId('graphql-request').click();
      await page.getByTestId('request-name').fill('Folder GraphQL Request');
      await page.getByTestId('new-request-url').locator('.CodeMirror').click();
      await page.keyboard.type('https://api.example.com/graphql/v2');
      await locators.modal.button('Create').click();
    });

    await test.step('Verify GraphQL request was created within folder1', async () => {
      // Open collection and verify request is not in collection root
      await locators.sidebar.collection('create-requests').click();
      const folderRequestItem = locators.sidebar.folderRequest('folder1', 'Folder GraphQL Request');
      await expect(folderRequestItem).toBeVisible();

      // Open request and verify it is the active request
      await folderRequestItem.click();
      await expect(locators.tabs.activeRequestTab()).toContainText('Folder GraphQL Request');
    });
  });
});
