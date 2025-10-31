import { test, expect } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import { closeAllCollections } from '../../utils/page';

test.describe('Create HTTP Requests', () => {
  let locators: ReturnType<typeof buildCommonLocators>;

  test.beforeAll(async ({ pageWithUserData: page }) => {
    locators = buildCommonLocators(page);
  });

  test.afterAll(async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    // Clean up Root HTTP Request
    await locators.sidebar.request('Root HTTP Request').click({ button: 'right' });
    await locators.dropdown.item('Delete').click();
    await locators.modal.button('Delete').click();

    // Clean up Folder HTTP Request
    await locators.sidebar.folder('folder1').click();
    await locators.sidebar.request('Folder HTTP Request').click({ button: 'right' });
    await locators.dropdown.item('Delete').click();
    await locators.modal.button('Delete').click();

    // Clean up collection
    await closeAllCollections(page);
  });

  test('Verifies that HTTP requests are created at the expected locations', async ({ pageWithUserData: page }) => {
    await test.step('Navigate to collection and verify it exists', async () => {
      await expect(locators.sidebar.collection('create-requests')).toContainText('create-requests');
    });

    await test.step('Create HTTP request via collection three dots menu', async () => {
      await locators.sidebar.collection('create-requests').hover();
      await locators.actions.collectionActions('create-requests').click();
      await locators.dropdown.item('New Request').click();

      await page.getByTestId('request-name').fill('Root HTTP Request');
      await page.getByTestId('new-request-url').locator('.CodeMirror').click();
      await page.keyboard.type('https://httpbin.org/get');
      await locators.modal.button('Create').click();
    });

    await test.step('Verify HTTP request was created at collection root', async () => {
      // Open collection and verify request is present in collection root
      await locators.sidebar.collection('create-requests').click();
      const requestItem = locators.sidebar.request('Root HTTP Request');
      await expect(requestItem).toBeVisible();

      // Open request and verify it is the active request
      await requestItem.click();
      await expect(locators.tabs.activeRequestTab()).toContainText('Root HTTP Request');

      // Open folder1 and verify request is not in folder1
      await locators.sidebar.folder('folder1').click();
      const folderRequestItem = locators.sidebar.folderRequest('folder1', 'Root HTTP Request');
      await expect(folderRequestItem).not.toBeVisible();
    });

    await test.step('Create HTTP request via folder1 three dots menu', async () => {
      const folderItem = locators.sidebar.folder('folder1');
      await folderItem.click({ button: 'right' });
      await locators.dropdown.item('New Request').click();

      await page.getByTestId('request-name').fill('Folder HTTP Request');
      await page.getByTestId('new-request-url').locator('.CodeMirror').click();
      await page.keyboard.type('https://httpbin.org/post');
      await locators.modal.button('Create').click();
    });

    await test.step('Verify HTTP request was created within folder1', async () => {
      // Open collection and verify request is not in collection root
      await locators.sidebar.collection('create-requests').click();
      const requestItem = locators.sidebar.request('Folder HTTP Request');
      await expect(requestItem).not.toBeVisible();

      // Open folder1 and verify request is present in folder1
      await locators.sidebar.folder('folder1').click();
      await expect(requestItem).toBeVisible();

      // Open request and verify it is the active request
      await requestItem.click();
      await expect(locators.tabs.activeRequestTab()).toContainText('Folder HTTP Request');
    });
  });
});
