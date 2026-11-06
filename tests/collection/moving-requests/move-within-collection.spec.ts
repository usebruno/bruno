import { test, expect } from '../../../playwright';
import { buildCommonLocators, createCollection, createRequest, createFolder, expandFolder, closeAllCollections } from '../../utils/page';

test.describe('Move across folders within the same collection', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('moving a request into a sibling folder removes it from the source folder', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const collectionName = 'Move Request Col';
    const requestName = 'echo';

    await createCollection(page, collectionName, await createTmpDir('move-request-col'), 'bru');
    await createFolder(page, 'folder-a', collectionName);
    await createFolder(page, 'folder-b', collectionName);

    await expandFolder(page, 'folder-a');
    await createRequest(page, requestName, 'folder-a', { inFolder: true, url: 'https://echo.usebruno.com' });

    await test.step('Drag the request from folder-a into folder-b', async () => {
      const source = sidebar.folderScope('folder-a').locator('.collection-item-name').filter({ hasText: requestName });
      await expect(source).toBeVisible();
      await source.dragTo(sidebar.folder('folder-b'));
    });

    await test.step('The request is in folder-b and gone from folder-a', async () => {
      await expandFolder(page, 'folder-b');
      await expect(sidebar.folderScope('folder-b').locator('.collection-item-name').filter({ hasText: requestName })).toBeVisible();
      await expect(sidebar.folderScope('folder-a').locator('.collection-item-name').filter({ hasText: requestName })).toHaveCount(0);
    });
  });

  test('moving a folder (with a nested request) into a sibling folder removes it from the source folder', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const collectionName = 'Move Folder Col';
    const movedFolderName = 'moved-folder';

    await createCollection(page, collectionName, await createTmpDir('move-folder-col'), 'bru');
    await createFolder(page, 'parent-a', collectionName);
    await createFolder(page, 'parent-b', collectionName);

    await expandFolder(page, 'parent-a');
    await createFolder(page, movedFolderName, 'parent-a', false);
    await expandFolder(page, movedFolderName);
    await createRequest(page, 'nested-req', movedFolderName, { inFolder: true, url: 'https://echo.usebruno.com' });

    await test.step('Drag "moved-folder" from parent-a into parent-b', async () => {
      const source = sidebar.folderScope('parent-a').locator('.collection-item-name').filter({ hasText: movedFolderName });
      await expect(source).toBeVisible();
      await source.dragTo(sidebar.folder('parent-b'));
    });

    await test.step('"moved-folder" is in parent-b and gone from parent-a', async () => {
      await expandFolder(page, 'parent-b');
      await expect(sidebar.folderScope('parent-b').locator('.collection-item-name').filter({ hasText: movedFolderName })).toBeVisible();
      await expect(sidebar.folderScope('parent-a').locator('.collection-item-name').filter({ hasText: movedFolderName })).toHaveCount(0);
    });

    await test.step('Its nested request moved along with it', async () => {
      await expandFolder(page, movedFolderName);
      await expect(sidebar.folderScope(movedFolderName).locator('.collection-item-name').filter({ hasText: 'nested-req' })).toBeVisible();
    });
  });
});
