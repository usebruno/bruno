import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import { createCollection, closeAllCollections } from '../../utils/page';

test.describe('Naming collisions - create collection', () => {
  test.afterEach(async ({ page }) => {
    await page.keyboard.press('Escape');
    await closeAllCollections(page);
  });

  test('creating a collection where the folder name exists makes a new suffixed directory', async ({ page, createTmpDir }) => {
    const location = await createTmpDir('collection-create-dup');

    // Seed a directory that collides with the collection's folder name. It must
    // NOT be reused — a new, suffixed directory should be created instead.
    fs.mkdirSync(path.join(location, 'MyColl'), { recursive: true });
    fs.writeFileSync(path.join(location, 'MyColl', 'marker.txt'), 'pre-existing');

    await createCollection(page, 'MyColl', location, 'bru');

    await test.step('On disk: the pre-existing dir is untouched and a suffixed collection dir is created', async () => {
      // The seeded directory is left as-is (no bruno.json written into it).
      expect(fs.existsSync(path.join(location, 'MyColl', 'marker.txt'))).toBe(true);
      expect(fs.existsSync(path.join(location, 'MyColl', 'bruno.json'))).toBe(false);

      // The new collection lands in a silently-suffixed directory.
      await expect
        .poll(() => fs.existsSync(path.join(location, 'MyColl1', 'bruno.json')), { timeout: 10000 })
        .toBe(true);
    });
  });

  test('creating a yml collection where the folder name exists makes a new suffixed directory', async ({ page, createTmpDir }) => {
    const location = await createTmpDir('collection-create-dup-yml');

    fs.mkdirSync(path.join(location, 'MyColl'), { recursive: true });
    fs.writeFileSync(path.join(location, 'MyColl', 'marker.txt'), 'pre-existing');

    await createCollection(page, 'MyColl', location, 'yml');

    await test.step('On disk: pre-existing dir untouched; new yml collection dir suffixed', async () => {
      expect(fs.existsSync(path.join(location, 'MyColl', 'marker.txt'))).toBe(true);
      expect(fs.existsSync(path.join(location, 'MyColl', 'opencollection.yml'))).toBe(false);

      await expect
        .poll(() => fs.existsSync(path.join(location, 'MyColl1', 'opencollection.yml')), { timeout: 10000 })
        .toBe(true);
    });
  });
});
