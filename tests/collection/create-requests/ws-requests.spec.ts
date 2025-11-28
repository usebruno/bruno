import { test, expect } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import { closeAllCollections } from '../../utils/page';

test.describe('Create WebSocket Requests', () => {
  let locators: ReturnType<typeof buildCommonLocators>;

  test.beforeAll(async ({ pageWithUserData: page }) => {
    locators = buildCommonLocators(page);
  });

  test.afterAll(async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    // Clean up Folder WebSocket Request
    await locators.sidebar.request('Folder WebSocket Request').hover();
    await locators.actions.collectionItemActions('Folder WebSocket Request').click();
    await locators.dropdown.item('Delete').click();
    await locators.modal.button('Delete').click();

    // Clean up Root WebSocket Request
    await locators.sidebar.request('Root WebSocket Request').hover();
    await locators.actions.collectionItemActions('Root WebSocket Request').click();
    await locators.dropdown.item('Delete').click();
    await locators.modal.button('Delete').click();

    // Clean up collection
    await closeAllCollections(page);
  });

  test('Verifies that WebSocket requests are created at the expected locations', async ({ pageWithUserData: page }) => {
    await test.step('Navigate to collection and verify it exists', async () => {
      await expect(locators.sidebar.collection('create-requests')).toBeVisible();
    });

    await test.step('Create WebSocket request via collection three dots menu', async () => {
      await locators.sidebar.collection('create-requests').hover();
      await locators.actions.collectionActions('create-requests').click();
      await locators.dropdown.item('New Request').click();

      await page.getByTestId('ws-request').click();
      await page.getByTestId('request-name').fill('Root WebSocket Request');
      await page.getByTestId('new-request-url').locator('.CodeMirror').click();
      await page.keyboard.type('ws://localhost:8080');
      await locators.modal.button('Create').click();
    });

    await test.step('Verify WebSocket request was created at collection root', async () => {
      // Open collection and verify request is present in collection root
      await locators.sidebar.collection('create-requests').click();
      const requestItem = locators.sidebar.request('Root WebSocket Request');
      await expect(requestItem).toBeVisible();

      // Open request and verify it is the active request
      await requestItem.click();
      await expect(locators.tabs.activeRequestTab()).toContainText('Root WebSocket Request');

      // Open folder1 and verify request is not in folder1
      await locators.sidebar.folder('folder1').click();
      const folderRequestItem = locators.sidebar.folderRequest('folder1', 'Root WebSocket Request');
      await expect(folderRequestItem).not.toBeVisible();
    });

    await test.step('Create WebSocket request via folder1 three dots menu', async () => {
      await locators.sidebar.folder('folder1').hover();
      await locators.actions.collectionItemActions('folder1').click();
      await locators.dropdown.item('New Request').click();

      await page.getByTestId('ws-request').click();
      await page.getByTestId('request-name').fill('Folder WebSocket Request');
      await page.getByTestId('new-request-url').locator('.CodeMirror').click();
      await page.keyboard.type('ws://localhost:8081');
      await locators.modal.button('Create').click();
    });

    await test.step('Verify WebSocket request was created within folder1', async () => {
      // Open collection and verify request is not in collection root
      await locators.sidebar.collection('create-requests').click();
      const folderRequestItem = locators.sidebar.folderRequest('folder1', 'Folder WebSocket Request');
      await expect(folderRequestItem).toBeVisible();

      // Open request and verify it is the active request
      await folderRequestItem.click();
      await expect(locators.tabs.activeRequestTab()).toContainText('Folder WebSocket Request');
    });
  });
});
