import { test, expect } from '../../playwright';
import { buildCommonLocators, createCollection, closeAllCollections, createRequestViaModal } from '../utils/page';
import { listRequestFiles } from './utils';

test.describe('Naming collisions - long names', () => {
  test.afterEach(async ({ page }) => {
    await page.keyboard.press('Escape');
    await closeAllCollections(page);
  });

  test('a ~255-char name collision is truncated and suffixed within the filesystem limit', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('long-names');
    const longName = 'a'.repeat(255); // max allowed display name length

    await createCollection(page, 'Long Names', testDir, 'bru');

    // Two requests with the same 255-char name — drive the modal directly since
    // createRequest asserts visibility by name (would strict-violate on a dupe).
    await createRequestViaModal(page, 'Long Names', longName);
    await createRequestViaModal(page, 'Long Names', longName);

    await test.step('Both display names appear in the sidebar', async () => {
      await expect(nc.itemByTitle(longName)).toHaveCount(2);
    });

    await test.step('On disk: two distinct .bru files, each within the 255-char limit', async () => {
      const files = listRequestFiles(testDir);
      expect(files).toHaveLength(2);
      expect(new Set(files).size).toBe(2); // distinct (truncated base + numeric suffix)
      for (const f of files) {
        expect(f.endsWith('.bru')).toBe(true);
        expect(f.length).toBeLessThanOrEqual(255);
      }
    });
  });
});
