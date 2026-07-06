import * as fs from 'fs';
import * as path from 'path';
import { test, expect, Page } from '../../../playwright';
import { buildCommonLocators, createCollection, createRequest, createFolder, closeAllCollections } from '../../utils/page';
import { listRequestFiles, findCollectionDir } from '../utils';

/** The folder row scoped to a specific collection's sidebar container. */
const folderInCollection = (page: Page, collectionName: string, folderName: string) =>
  page
    .locator('.collection-name')
    .filter({ hasText: collectionName })
    .locator('..')
    .locator('.collection-item-name')
    .filter({ hasText: folderName })
    .first();

const seedFolder = (collectionDir: string, folderName: string) => {
  const dir = path.join(collectionDir, folderName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'folder.bru'), `meta {\n  name: ${folderName}\n  seq: 1\n}\n`);
};

test.describe('Naming collisions - drag/drop folder', () => {
  test.afterEach(async ({ page }) => {
    await page.keyboard.press('Escape');
    await closeAllCollections(page);
  });

  test('dragging a folder into a collection that has the same folder name suffixes the directory', async ({ page, createTmpDir }) => {
    const sourceDir = await createTmpDir('folder-drag-source');
    const targetDir = await createTmpDir('folder-drag-target');

    await createCollection(page, 'Folder Drag Source', sourceDir, 'bru');
    await createFolder(page, 'Auth', 'Folder Drag Source');
    await buildCommonLocators(page).sidebar.folder('Auth').dblclick(); // expand
    await createRequest(page, 'login', 'Auth', { inFolder: true }); // Auth/login.bru

    await createCollection(page, 'Folder Drag Target', targetDir, 'bru');
    // Seed a colliding "Auth" folder in the target.
    seedFolder(findCollectionDir(targetDir), 'Auth');

    await test.step('Drag the "Auth" folder from the source onto the target collection', async () => {
      const source = folderInCollection(page, 'Folder Drag Source', 'Auth');
      const target = page.locator('.collection-name').filter({ hasText: 'Folder Drag Target' });
      await expect(source).toBeVisible();
      await source.dragTo(target);
    });

    await test.step('Target keeps both folders (dir suffixed); moved subtree intact; source emptied', async () => {
      const collDir = findCollectionDir(targetDir);
      await expect.poll(() => fs.existsSync(path.join(collDir, 'Auth')), { timeout: 10000 }).toBe(true);
      await expect.poll(() => fs.existsSync(path.join(collDir, 'Auth1')), { timeout: 10000 }).toBe(true);
      // The moved folder (suffixed to Auth1) still carries its nested request.
      expect(listRequestFiles(path.join(collDir, 'Auth1'))).toContain('login.bru');
      // Source no longer has the folder.
      expect(fs.existsSync(path.join(findCollectionDir(sourceDir), 'Auth'))).toBe(false);
    });
  });

  test('dragging a folder into a collection with no collision keeps its name', async ({ page, createTmpDir }) => {
    const sourceDir = await createTmpDir('folder-drag-nc-source');
    const targetDir = await createTmpDir('folder-drag-nc-target');

    await createCollection(page, 'Folder NC Source', sourceDir, 'bru');
    await createFolder(page, 'Auth', 'Folder NC Source');
    await buildCommonLocators(page).sidebar.folder('Auth').dblclick();
    await createRequest(page, 'login', 'Auth', { inFolder: true });

    await createCollection(page, 'Folder NC Target', targetDir, 'bru'); // empty target

    await test.step('Drag "Auth" onto the empty target collection', async () => {
      const source = folderInCollection(page, 'Folder NC Source', 'Auth');
      const target = page.locator('.collection-name').filter({ hasText: 'Folder NC Target' });
      await expect(source).toBeVisible();
      await source.dragTo(target);
    });

    await test.step('Target has "Auth" (no suffix) with subtree; source emptied', async () => {
      const collDir = findCollectionDir(targetDir);
      await expect.poll(() => fs.existsSync(path.join(collDir, 'Auth')), { timeout: 10000 }).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'Auth1'))).toBe(false);
      expect(listRequestFiles(path.join(collDir, 'Auth'))).toContain('login.bru');
      expect(fs.existsSync(path.join(findCollectionDir(sourceDir), 'Auth'))).toBe(false);
    });
  });

  test('reordering folders within the same collection does not create a copy', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('folder-drag-reorder');

    await createCollection(page, 'Folder Reorder', testDir, 'bru');
    await createFolder(page, 'Alpha', 'Folder Reorder');
    await createFolder(page, 'Beta', 'Folder Reorder');

    await test.step('Drag "Beta" onto "Alpha" (same-collection reorder)', async () => {
      const beta = folderInCollection(page, 'Folder Reorder', 'Beta');
      const alpha = folderInCollection(page, 'Folder Reorder', 'Alpha');
      await beta.dragTo(alpha, { targetPosition: { x: 5, y: 5 } });
    });

    await test.step('Still exactly two folders, no suffixed duplicate', async () => {
      // Give any (incorrect) move a chance to land, then assert nothing was duplicated.
      await page.waitForTimeout(1000);
      const collDir = findCollectionDir(testDir);
      expect(fs.existsSync(path.join(collDir, 'Alpha'))).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'Beta'))).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'Alpha1'))).toBe(false);
      expect(fs.existsSync(path.join(collDir, 'Beta1'))).toBe(false);
    });
  });
});
