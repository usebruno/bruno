import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import { buildCommonLocators, createCollection, createRequest, createFolder, closeAllCollections } from '../../utils/page';
import { listRequestFiles, findCollectionDir } from '../utils';

/** Seed a folder (with its folder settings file) directly on disk. */
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
    const { sidebar, namingCollisions: nc } = buildCommonLocators(page);
    const sourceDir = await createTmpDir('folder-drag-source');
    const targetDir = await createTmpDir('folder-drag-target');

    await createCollection(page, 'Folder Drag Source', sourceDir, 'bru');
    await createFolder(page, 'Auth', 'Folder Drag Source');
    await sidebar.folder('Auth').dblclick(); // expand
    await createRequest(page, 'login', 'Auth', { inFolder: true }); // Auth/login.bru

    await createCollection(page, 'Folder Drag Target', targetDir, 'bru');
    seedFolder(findCollectionDir(targetDir), 'Auth'); // colliding folder in target

    await test.step('Drag the "Auth" folder from the source onto the target collection', async () => {
      const source = nc.itemInCollection('Folder Drag Source', 'Auth');
      await expect(source).toBeVisible();
      await source.dragTo(nc.collectionDropTarget('Folder Drag Target'));
    });

    await test.step('Target keeps both folders (dir suffixed); moved subtree intact; source emptied', async () => {
      const collDir = findCollectionDir(targetDir);
      await expect.poll(() => fs.existsSync(path.join(collDir, 'Auth')), { timeout: 10000 }).toBe(true);
      await expect.poll(() => fs.existsSync(path.join(collDir, 'Auth1')), { timeout: 10000 }).toBe(true);
      expect(listRequestFiles(path.join(collDir, 'Auth1'))).toContain('login.bru');
      expect(fs.existsSync(path.join(findCollectionDir(sourceDir), 'Auth'))).toBe(false);
    });
  });

  test('dragging a folder into a collection with no collision keeps its name', async ({ page, createTmpDir }) => {
    const { sidebar, namingCollisions: nc } = buildCommonLocators(page);
    const sourceDir = await createTmpDir('folder-drag-nc-source');
    const targetDir = await createTmpDir('folder-drag-nc-target');

    await createCollection(page, 'Folder NC Source', sourceDir, 'bru');
    await createFolder(page, 'Auth', 'Folder NC Source');
    await sidebar.folder('Auth').dblclick();
    await createRequest(page, 'login', 'Auth', { inFolder: true });

    await createCollection(page, 'Folder NC Target', targetDir, 'bru'); // empty target

    await test.step('Drag "Auth" onto the empty target collection', async () => {
      const source = nc.itemInCollection('Folder NC Source', 'Auth');
      await expect(source).toBeVisible();
      await source.dragTo(nc.collectionDropTarget('Folder NC Target'));
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
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-drag-reorder');

    await createCollection(page, 'Folder Reorder', testDir, 'bru');
    await createFolder(page, 'Alpha', 'Folder Reorder');
    await createFolder(page, 'Beta', 'Folder Reorder');

    await test.step('Drag "Beta" onto "Alpha" (same-collection reorder)', async () => {
      await nc.itemInCollection('Folder Reorder', 'Beta').dragTo(nc.itemInCollection('Folder Reorder', 'Alpha'), {
        targetPosition: { x: 5, y: 5 }
      });
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
