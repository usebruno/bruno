import { test, expect } from '../../../playwright';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { buildCommonLocators, closeAllCollections, importCollection } from '../../utils/page';

const ESCAPING_SYMLINK_ZIP = path.join(__dirname, 'fixtures', 'Escaping Symlink.zip');
const INSIDE_SYMLINK_COLLECTION = 'Inside Symlink';
const INSIDE_SYMLINK_ZIP = path.join(__dirname, 'fixtures', `${INSIDE_SYMLINK_COLLECTION}.zip`);

// Windows denies symlink creation without Developer Mode or admin rights, and the app's zip
// extraction runs as the same user, so probe once and skip only where symlinks can't be created.
const symlinksSupported = (() => {
  const probeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-symlink-probe-'));
  try {
    fs.writeFileSync(path.join(probeDir, 'target'), '');
    fs.symlinkSync('target', path.join(probeDir, 'link'), 'file');
    return true;
  } catch (err: any) {
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes(err.code)) return false;
    throw err;
  } finally {
    fs.rmSync(probeDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
})();

test.describe('Collection ZIP import with symlinks', () => {
  test.skip(!symlinksSupported, 'This machine does not allow creating symlinks');

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('importing a zip with a symlink that escapes the collection shows an error with the symlink path', async ({
    page,
    createTmpDir
  }) => {
    const collectionLocation = await createTmpDir('zip-symlink-escape-location');

    await importCollection(page, ESCAPING_SYMLINK_ZIP, collectionLocation);

    await test.step('An error toast names the symlink and the security reason', async () => {
      const errorToast = buildCommonLocators(page).toast.byMessage(
        'symlink "Escaping Symlink/scripts/boilerplate.js" that points outside the collection directory'
      );
      await expect(errorToast).toBeVisible();
    });

    await test.step('Nothing is written to the chosen location', async () => {
      expect(fs.readdirSync(collectionLocation)).toEqual([]);
    });

    await test.step('The location dialog stays open and Cancel closes it', async () => {
      const locationModal = buildCommonLocators(page).import.locationModal();
      await expect(locationModal).toBeVisible();
      await locationModal.getByRole('button', { name: 'Cancel' }).click();
      await expect(locationModal).toBeHidden();
    });
  });

  test('importing a zip with a symlink inside the collection succeeds', async ({ page, createTmpDir }) => {
    const collectionLocation = await createTmpDir('zip-symlink-inside-location');

    await importCollection(page, INSIDE_SYMLINK_ZIP, collectionLocation, { expectedCollectionName: INSIDE_SYMLINK_COLLECTION });

    await test.step('The in-collection symlink is kept', async () => {
      const linkPath = path.join(collectionLocation, INSIDE_SYMLINK_COLLECTION, 'notes-link.txt');
      expect(fs.lstatSync(linkPath).isSymbolicLink()).toBe(true);
      expect(fs.readFileSync(linkPath, 'utf8')).toBe('collection notes');
    });
  });
});
