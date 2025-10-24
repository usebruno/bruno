import { test, expect } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Create HTTP Requests', () => {
  test('Create HTTP request at collection root level', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await test.step('Navigate to collection and verify it exists', async () => {
      await expect(locators.sidebar.collection('create-requests')).toContainText('create-requests');
    });

    await test.step('Create HTTP request via collection three dots menu', async () => {
      await locators.sidebar.collection('create-requests').hover();
      await locators.actions.collectionActions().click();
      await locators.dropdown.item('New Request').click();
      await expect(locators.modal.title('New Request')).toBeVisible();
      await page.getByTestId('request-name').fill('Root HTTP Request');
      await page.getByTestId('new-request-url').locator('.CodeMirror').click();
      await page.keyboard.type('https://httpbin.org/get');
      await locators.modal.button('Create').click();
    });

    await test.step('Verify HTTP request was created at collection root', async () => {
      const collectionItem = locators.sidebar.collection('create-requests');
      await expect(collectionItem).toBeVisible();
      await collectionItem.click();
      const folderItem = locators.sidebar.folder('folder1');
      await expect(folderItem).toBeVisible();
      const requestItem = locators.sidebar.request('Root HTTP Request');
      await expect(requestItem).toBeVisible();
      await requestItem.click();
      await expect(locators.tabs.requestTab()).toContainText('Root HTTP Request');
    });

    await test.step('Clean up', async () => {
      await locators.sidebar.request('Root HTTP Request').click({ button: 'right' });
      await locators.dropdown.item('Delete').click();
      await locators.modal.button('Delete').click();
    });
  });

  test('Create HTTP request within folder1', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await test.step('Navigate to collection and verify folder1 exists', async () => {
      const collectionItem = locators.sidebar.collection('create-requests');
      await expect(collectionItem).toBeVisible();
      await collectionItem.click();
      await expect(locators.sidebar.folder('folder1')).toBeVisible();
    });

    await test.step('Create HTTP request via folder1 three dots menu', async () => {
      const folderItem = locators.sidebar.folder('folder1');
      await folderItem.click({ button: 'right' });
      await locators.dropdown.item('New Request').click();
      await expect(locators.modal.title('New Request')).toBeVisible();
      await page.getByTestId('request-name').fill('Folder HTTP Request');
      await page.getByTestId('new-request-url').locator('.CodeMirror').click();
      await page.keyboard.type('https://httpbin.org/post');
      await locators.modal.button('Create').click();
    });

    await test.step('Verify HTTP request was created within folder1', async () => {
      const folderItem = locators.sidebar.folder('folder1');
      await folderItem.click();
      const requestItem = locators.sidebar.request('Folder HTTP Request');
      await expect(requestItem).toBeVisible({ timeout: 1000 });
      await requestItem.click();
      await expect(locators.tabs.requestTab()).toContainText('Folder HTTP Request');
      const chevron = locators.folder.chevron('folder1');
      await expect(chevron).toBeVisible();
      await chevron.click();
      await expect(requestItem).not.toBeVisible({ timeout: 1000 });
      await folderItem.click();
    });

    await test.step('Clean up', async () => {
      await locators.sidebar.request('Folder HTTP Request').click({ button: 'right' });
      await locators.dropdown.item('Delete').click();
      await locators.modal.button('Delete').click();
    });
  });
});
