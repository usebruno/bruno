import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import { buildCommonLocators, createCollection, createRequest, createFolder, closeAllCollections } from '../../utils/page';
import { listRequestFiles, findCollectionDir, minimalBru } from '../utils';

test.describe('Naming collisions - drag/drop request', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('dragging a request into a collection that has the same name suffixes the file', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const sourceDir = await createTmpDir('drag-source');
    const targetDir = await createTmpDir('drag-target');

    await createCollection(page, 'Drag Source', sourceDir, 'bru');
    await createRequest(page, 'login', 'Drag Source');

    await createCollection(page, 'Drag Target', targetDir, 'bru');
    // Seed a colliding "login.bru" in the target directly on disk.
    fs.writeFileSync(path.join(findCollectionDir(targetDir), 'login.bru'), minimalBru('login'));

    await test.step('Drag "login" from the source collection onto the target collection', async () => {
      const source = nc.itemInCollection('Drag Source', 'login');
      await expect(source).toBeVisible();
      await source.dragTo(nc.collectionDropTarget('Drag Target'));
    });

    await test.step('Target keeps both files (silently suffixed); source is emptied', async () => {
      await expect
        .poll(() => listRequestFiles(targetDir).sort(), { timeout: 10000 })
        .toEqual(['login.bru', 'login1.bru']);
      expect(listRequestFiles(sourceDir)).not.toContain('login.bru');
    });
  });

  test('dragging a request into a collection with no collision keeps its name', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const sourceDir = await createTmpDir('drag-nc-source');
    const targetDir = await createTmpDir('drag-nc-target');

    await createCollection(page, 'NC Source', sourceDir, 'bru');
    await createRequest(page, 'login', 'NC Source');
    await createCollection(page, 'NC Target', targetDir, 'bru'); // empty target

    await test.step('Drag "login" onto the empty target collection', async () => {
      const source = nc.itemInCollection('NC Source', 'login');
      await expect(source).toBeVisible();
      await source.dragTo(nc.collectionDropTarget('NC Target'));
    });

    await test.step('Target has "login.bru" (no suffix); source is emptied', async () => {
      await expect.poll(() => listRequestFiles(targetDir), { timeout: 10000 }).toEqual(['login.bru']);
      expect(listRequestFiles(sourceDir)).not.toContain('login.bru');
    });
  });

  test('reordering within the same collection does not create a copy', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('drag-reorder');

    await createCollection(page, 'Reorder', testDir, 'bru');
    await createRequest(page, 'alpha', 'Reorder');
    await createRequest(page, 'beta', 'Reorder');

    await test.step('Drag "beta" onto "alpha" (same-folder reorder)', async () => {
      await nc.itemInCollection('Reorder', 'beta').dragTo(nc.itemInCollection('Reorder', 'alpha'), {
        targetPosition: { x: 5, y: 5 }
      });
    });

    await test.step('Still exactly two files, no suffixed duplicate', async () => {
      // Give any (incorrect) move a chance to land, then assert nothing was duplicated.
      await page.waitForTimeout(1000);
      const files = listRequestFiles(testDir).sort();
      expect(files).toEqual(['alpha.bru', 'beta.bru']);
    });
  });

  test('cross-format move converts to .yml and suffixes on collision', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const sourceDir = await createTmpDir('drag-xfmt-source');
    const targetDir = await createTmpDir('drag-xfmt-target');

    await createCollection(page, 'Xfmt Source', sourceDir, 'bru');
    await createRequest(page, 'login', 'Xfmt Source'); // login.bru
    await createCollection(page, 'Xfmt Target', targetDir, 'yml');
    // Seed a colliding "login.yml" in the yml target.
    fs.writeFileSync(
      path.join(findCollectionDir(targetDir), 'login.yml'),
      'meta:\n  name: login\n  type: http\n  seq: 1\n'
    );

    await test.step('Drag the .bru "login" onto the yml collection', async () => {
      const source = nc.itemInCollection('Xfmt Source', 'login');
      await expect(source).toBeVisible();
      await source.dragTo(nc.collectionDropTarget('Xfmt Target'));
    });

    await test.step('Target holds two .yml files (converted + suffixed); source emptied', async () => {
      await expect
        .poll(() => listRequestFiles(targetDir, '.yml').sort(), { timeout: 10000 })
        .toEqual(['login.yml', 'login1.yml']);
      expect(listRequestFiles(sourceDir)).not.toContain('login.bru');
    });
  });

  test('an open tab follows a request moved into a folder (identity preserved)', async ({ page, createTmpDir }) => {
    const { sidebar, tabs } = buildCommonLocators(page);
    const testDir = await createTmpDir('drag-tab');

    await createCollection(page, 'Tab Move', testDir, 'bru');
    await createFolder(page, 'Auth', 'Tab Move');
    await sidebar.folder('Auth').dblclick(); // expand the (empty) folder
    await createRequest(page, 'login', 'Tab Move'); // login at the collection root

    await test.step('Open the request, then drag it into the "Auth" folder', async () => {
      await sidebar.request('login').first().dblclick();
      await expect(tabs.requestTab('login')).toBeVisible({ timeout: 5000 });
      await sidebar.request('login').first().dragTo(sidebar.folder('Auth'));
    });

    await test.step('Tab stays open and the file moved into the folder', async () => {
      await expect(tabs.requestTab('login')).toBeVisible({ timeout: 5000 });
      await expect(tabs.requestTab('login')).toHaveCount(1);
      await expect
        .poll(() => listRequestFiles(path.join(testDir, 'Tab Move', 'Auth')), { timeout: 10000 })
        .toEqual(['login.bru']);
    });
  });
});
