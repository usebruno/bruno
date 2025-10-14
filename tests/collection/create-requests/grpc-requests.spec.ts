import { test, expect } from '../../../playwright';

test.describe('Create gRPC Requests', () => {
  test('Create gRPC request at collection root level', async ({ pageWithUserData: page }) => {
    await test.step('Navigate to collection and verify it exists', async () => {
      await expect(page.locator('#sidebar-collection-name')).toContainText('create-requests');
    });

    await test.step('Create gRPC request via collection three dots menu', async () => {
      await page.locator('#sidebar-collection-name').filter({ hasText: 'create-requests' }).hover();
      await page.locator('.collection-actions .icon').click();
      await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();
      const modalHeaderTitle = page.locator('.bruno-modal-header-title').filter({ hasText: 'New Request' });
      await expect(modalHeaderTitle).toBeVisible();
      await page.getByTestId('grpc-request').click();
      await page.getByTestId('request-name').fill('Root gRPC Request');
      await page.getByTestId('new-request-url').locator('.CodeMirror').click();
      await page.keyboard.type('grpc://localhost:50051');
      await page.getByRole('button', { name: 'Create', exact: true }).click();
    });

    await test.step('Verify gRPC request was created at collection root', async () => {
      const collectionItem = page.locator('#sidebar-collection-name').filter({ hasText: 'create-requests' });
      await expect(collectionItem).toBeVisible();
      await collectionItem.click();
      const folderItem = page.locator('.collection-item-name').filter({ hasText: 'folder1' });
      await expect(folderItem).toBeVisible();
      const requestItem = page.locator('.collection-item-name').filter({ hasText: 'Root gRPC Request' });
      await expect(requestItem).toBeVisible();
      await requestItem.click();
      await expect(page.locator('.request-tab .tab-label')).toContainText('Root gRPC Request');
    });

    await test.step('Clean up', async () => {
      await page.locator('.collection-item-name').filter({ hasText: 'Root gRPC Request' }).click({ button: 'right' });
      await page.locator('.dropdown-item').filter({ hasText: 'Delete' }).click();
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
    });
  });

  test('Create gRPC request within folder1', async ({ pageWithUserData: page }) => {
    await test.step('Navigate to collection and verify folder1 exists', async () => {
      const collectionItem = page.locator('#sidebar-collection-name').filter({ hasText: 'create-requests' });
      await expect(collectionItem).toBeVisible();
      await collectionItem.click();
      await expect(page.locator('.collection-item-name').filter({ hasText: 'folder1' })).toBeVisible();
    });

    await test.step('Create gRPC request via folder1 three dots menu', async () => {
      const folderItem = page.locator('.collection-item-name').filter({ hasText: 'folder1' });
      await folderItem.click({ button: 'right' });
      await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();
      const modalHeaderTitle = page.locator('.bruno-modal-header-title').filter({ hasText: 'New Request' });
      await expect(modalHeaderTitle).toBeVisible();
      await page.getByTestId('grpc-request').click();
      await page.getByTestId('request-name').fill('Folder gRPC Request');
      await page.getByTestId('new-request-url').locator('.CodeMirror').click();
      await page.keyboard.type('grpc://localhost:50052');
      await page.getByRole('button', { name: 'Create', exact: true }).click();
    });

    await test.step('Verify gRPC request was created within folder1', async () => {
      const folderItem = page.locator('.collection-item-name').filter({ hasText: 'folder1' });
      await folderItem.click();
      const requestItem = page.locator('.collection-item-name').filter({ hasText: 'Folder gRPC Request' });
      await expect(requestItem).toBeVisible({ timeout: 1000 });
      await requestItem.click();
      await expect(page.locator('.request-tab .tab-label')).toContainText('Folder gRPC Request');
      const chevron = folderItem.getByTestId('folder-chevron');
      await expect(chevron).toBeVisible();
      await chevron.click();
      await expect(requestItem).not.toBeVisible({ timeout: 1000 });
      await folderItem.click();
    });

    await test.step('Clean up', async () => {
      await page.locator('.collection-item-name').filter({ hasText: 'Folder gRPC Request' }).click({ button: 'right' });
      await page.locator('.dropdown-item').filter({ hasText: 'Delete' }).click();
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
    });
  });
});
