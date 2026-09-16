import { test, expect, Page } from '../../playwright';
import {
  createCollection,
  createFolder,
  createApp,
  activeAppPreviewSlot,
  buildCommonLocators,
  expandFolder
} from '../utils/page';

const openCollectionMenu = async (page: Page, collectionName: string) => {
  const { sidebar, actions } = buildCommonLocators(page);
  await sidebar.collection(collectionName).hover();
  const trigger = actions.collectionActions(collectionName);
  await expect(trigger).toBeVisible({ timeout: 2000 });
  await trigger.click();
};

const openFolderMenu = async (page: Page, collectionName: string, folderName: string) => {
  const { sidebar } = buildCommonLocators(page);
  const folderRow = sidebar.collectionScope(collectionName).locator('.collection-item-name').filter({ hasText: folderName });
  await folderRow.hover();
  await folderRow.locator('.menu-icon').click();
};

const openNewAppModal = async (page: Page, opener: () => Promise<void>) => {
  await opener();
  await page.locator('.tippy-box:visible .dropdown-item').filter({ hasText: 'New App' }).click();
  const modal = page.locator('.bruno-modal').filter({ hasText: 'New App' });
  await expect(modal).toBeVisible({ timeout: 5000 });
  return modal;
};

const submitNewAppModal = async (modal: ReturnType<Page['locator']>) => {
  await modal.getByRole('button', { name: 'Create', exact: true }).click();
};

const appSidebarItem = (page: Page, collectionName: string, appName: string) => {
  const { sidebar } = buildCommonLocators(page);
  return sidebar.collectionScope(collectionName).locator('.collection-item-name').filter({ hasText: appName });
};

const appTab = (page: Page, appName: string) =>
  page.locator('.request-tab .tab-label').filter({ hasText: appName });

test.describe('Apps - creation flows', () => {
  // The Electron page is worker-scoped, so a modal or open menu left over from one test
  // will block sidebar clicks in the next. Dismiss both after every test.
  test.afterEach(async ({ page }) => {
    await page.keyboard.press('Escape').catch(() => {});
    if (await page.locator('.bruno-modal').count()) {
      await page.keyboard.press('Escape').catch(() => {});
      await page.locator('.bruno-modal').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
    }
  });

  test('TC-3372 New App option is available at folder level', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-create-tc3372');
    const collectionName = 'apps-create-tc3372';
    const folderName = 'folder-tc3372';
    await createCollection(page, collectionName, collectionPath);
    await createFolder(page, folderName, collectionName, true);

    await openFolderMenu(page, collectionName, folderName);
    await expect(
      page.locator('.tippy-box:visible .dropdown-item').filter({ hasText: 'New App' })
    ).toBeVisible();
  });

  test('TC-3374 Creating an app at folder level opens a new tab', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-create-tc3374');
    const collectionName = 'apps-create-tc3374';
    const folderName = 'folder-tc3374';
    await createCollection(page, collectionName, collectionPath);
    await createFolder(page, folderName, collectionName, true);

    await createApp(page, 'folder-app', { collectionName, folderName });

    await expandFolder(page, folderName);
    await expect(appSidebarItem(page, collectionName, 'folder-app')).toBeVisible();
    await expect(appTab(page, 'folder-app')).toBeVisible();
    await expect(activeAppPreviewSlot(page).getByTestId('collection-app')).toBeVisible({ timeout: 5000 });
  });

  test('TC-4170 User can create multiple apps in the same collection and folder', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-create-tc4170');
    const collectionName = 'apps-create-tc4170';
    const folderName = 'folder-tc4170';
    await createCollection(page, collectionName, collectionPath);
    await createFolder(page, folderName, collectionName, true);

    await test.step('Two collection-level apps coexist', async () => {
      await createApp(page, 'collection1', { collectionName });
      await createApp(page, 'collection2', { collectionName });
      await expect(appSidebarItem(page, collectionName, 'collection1')).toBeVisible();
      await expect(appSidebarItem(page, collectionName, 'collection2')).toBeVisible();
    });

    await test.step('Two folder-level apps coexist', async () => {
      await createApp(page, 'folder1', { collectionName, folderName });
      await createApp(page, 'folder2', { collectionName, folderName });
      await expandFolder(page, folderName);
      await expect(appSidebarItem(page, collectionName, 'folder1')).toBeVisible();
      await expect(appSidebarItem(page, collectionName, 'folder2')).toBeVisible();
    });
  });

  test('TC-4171 Duplicate collection-level app name is allowed (filename resolved silently)', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-create-tc4171');
    const collectionName = 'apps-create-tc4171';
    await createCollection(page, collectionName, collectionPath);

    await createApp(page, 'collectionapp', { collectionName });
    await createApp(page, 'collectionapp', { collectionName });

    await expect(appSidebarItem(page, collectionName, 'collectionapp')).toHaveCount(2);
  });

  test('TC-4172 Duplicate folder-level app name is allowed (filename resolved silently)', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-create-tc4172');
    const collectionName = 'apps-create-tc4172';
    const folderName = 'folder-tc4172';
    await createCollection(page, collectionName, collectionPath);
    await createFolder(page, folderName, collectionName, true);

    await createApp(page, 'folderapp', { collectionName, folderName });
    await createApp(page, 'folderapp', { collectionName, folderName });

    await expandFolder(page, folderName);
    await expect(appSidebarItem(page, collectionName, 'folderapp')).toHaveCount(2);
  });

  test('TC-4173 Same app name is allowed when parents differ', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-create-tc4173');
    const collectionName = 'apps-create-tc4173';
    const folderName = 'folder-tc4173';
    await createCollection(page, collectionName, collectionPath);
    await createFolder(page, folderName, collectionName, true);

    await createApp(page, 'app11', { collectionName });
    await createApp(page, 'app11', { collectionName, folderName });

    await expandFolder(page, folderName);
    await expect(appSidebarItem(page, collectionName, 'app11')).toHaveCount(2);
  });

  test('TC-4184 Clicking inside the modal but outside the name input does not close it', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-create-tc4184');
    const collectionName = 'apps-create-tc4184';
    await createCollection(page, collectionName, collectionPath);

    const modal = await openNewAppModal(page, () => openCollectionMenu(page, collectionName));
    const card = modal.locator('.bruno-modal-card');
    const beforeBox = await card.boundingBox();
    expect(beforeBox).not.toBeNull();

    // The header sits inside the modal card but outside the name input — clicking it must be a no-op.
    await modal.locator('.bruno-modal-header').click({ position: { x: 5, y: 5 } });

    await expect(modal).toBeVisible();
    const afterBox = await card.boundingBox();
    expect(afterBox).not.toBeNull();
    // Tolerate sub-pixel drift from layout re-measurement while still catching an actual resize.
    expect(afterBox!.width).toBeCloseTo(beforeBox!.width, 0);
    expect(afterBox!.height).toBeCloseTo(beforeBox!.height, 0);
    await expect(page.locator('.bruno-modal [data-testid="form-error"]')).toHaveCount(0);
  });

  test('TC-4185 Clicking on the backdrop closes the New App modal', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-create-tc4185');
    const collectionName = 'apps-create-tc4185';
    await createCollection(page, collectionName, collectionPath);

    const modal = await openNewAppModal(page, () => openCollectionMenu(page, collectionName));

    await page.locator('.bruno-modal-backdrop').click();
    await expect(modal).toBeHidden({ timeout: 5000 });
    await expect(page.locator('.bruno-modal [data-testid="form-error"]')).toHaveCount(0);
  });

  test('TC-4186 Submitting the New App modal with no name shows a validation error', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-create-tc4186');
    const collectionName = 'apps-create-tc4186';
    await createCollection(page, collectionName, collectionPath);

    const modal = await openNewAppModal(page, () => openCollectionMenu(page, collectionName));
    await submitNewAppModal(modal);

    await expect(modal.getByText('App name is required')).toBeVisible();
    await expect(modal).toBeVisible();
  });

  test('TC-4187 Submitting a valid name creates the app', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-create-tc4187');
    const collectionName = 'apps-create-tc4187';
    await createCollection(page, collectionName, collectionPath);

    const modal = await openNewAppModal(page, () => openCollectionMenu(page, collectionName));
    await modal.locator('input[name="appName"]').fill('my-first-app');
    await submitNewAppModal(modal);

    await expect(modal).toBeHidden({ timeout: 5000 });
    await expect(appSidebarItem(page, collectionName, 'my-first-app')).toBeVisible();

    const { toast } = buildCommonLocators(page);
    await expect(toast.byMessage(/App created/)).toBeVisible({ timeout: 5000 });
  });
});
