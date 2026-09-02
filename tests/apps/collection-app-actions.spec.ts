import { test, expect, Page } from '../../playwright';
import {
  createCollection,
  createApp,
  buildCommonLocators
} from '../utils/page';

const appSidebarRow = (page: Page, collectionName: string, appName: string) => {
  const { sidebar } = buildCommonLocators(page);
  return sidebar.collectionScope(collectionName).locator('.collection-item-name').filter({ hasText: appName });
};

const openAppRowMenu = async (page: Page, collectionName: string, appName: string) => {
  const row = appSidebarRow(page, collectionName, appName);
  await row.hover();
  await row.locator('.menu-icon').click();
};

const menuItem = (page: Page, label: string) =>
  page.locator('.tippy-box:visible .dropdown-item').filter({ hasText: label });

test.describe('Collection-level app actions', () => {
  test('TC-6035 Copy shows an "App copied" toast', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-actions-tc6035');
    const collectionName = 'apps-actions-tc6035';
    await createCollection(page, collectionName, collectionPath);
    await createApp(page, 'copy-src-app', { collectionName });

    await openAppRowMenu(page, collectionName, 'copy-src-app');
    await menuItem(page, 'Copy').click();

    const { toast } = buildCommonLocators(page);
    await expect(toast.byMessage(/App copied/)).toBeVisible({ timeout: 5000 });
  });

  test('TC-6036 Rename updates the collection-level app name', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-actions-tc6036');
    const collectionName = 'apps-actions-tc6036';
    await createCollection(page, collectionName, collectionPath);
    await createApp(page, 'rename-src', { collectionName });

    await openAppRowMenu(page, collectionName, 'rename-src');
    await menuItem(page, 'Rename').click();

    const modal = page.locator('.bruno-modal').filter({ hasText: 'Rename App' });
    await expect(modal).toBeVisible({ timeout: 5000 });

    const nameInput = modal.locator('#collection-item-name');
    await nameInput.fill('renamed-app');
    await modal.getByTestId('rename-item-button').click();

    await expect(modal).toBeHidden({ timeout: 5000 });
    await expect(appSidebarRow(page, collectionName, 'renamed-app')).toBeVisible();
    await expect(appSidebarRow(page, collectionName, 'rename-src')).toHaveCount(0);
  });

  test('TC-6038 Info modal shows the collection-level app name and filename', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-actions-tc6038');
    const collectionName = 'apps-actions-tc6038';
    await createCollection(page, collectionName, collectionPath);
    await createApp(page, 'info-app', { collectionName });

    await openAppRowMenu(page, collectionName, 'info-app');
    await menuItem(page, 'Info').click();

    const modal = page.locator('.bruno-modal').filter({ hasText: 'Info' });
    await expect(modal).toBeVisible({ timeout: 5000 });

    const rows = modal.locator('tbody tr');
    const nameRow = rows.filter({ hasText: 'App Name' });
    const fileRow = rows.filter({ hasText: 'File Name' });

    await expect(nameRow.locator('td').nth(1)).toContainText('info-app');
    // Filename is stored without extension; the .yml/.bru suffix is added at write time.
    await expect(fileRow.locator('td').nth(1)).toContainText('info-app');

    await modal.getByTestId('modal-close-button').click();
    await expect(modal).toBeHidden({ timeout: 5000 });
  });

  test('TC-6039 Delete removes the collection-level app after confirmation', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-actions-tc6039');
    const collectionName = 'apps-actions-tc6039';
    await createCollection(page, collectionName, collectionPath);
    await createApp(page, 'doomed-app', { collectionName });

    await expect(appSidebarRow(page, collectionName, 'doomed-app')).toBeVisible();

    await openAppRowMenu(page, collectionName, 'doomed-app');
    await menuItem(page, 'Delete').click();

    const modal = page.getByTestId('delete-collection-item-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal).toContainText('doomed-app');
    await modal.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(appSidebarRow(page, collectionName, 'doomed-app')).toHaveCount(0);
  });
});
