import process from 'node:process';
import * as path from 'path';
import { test, expect } from '../../playwright';
import {
  buildCommonLocators,
  createCollection,
  createRequest,
  createFolder,
  createTransientRequest,
  closeAllCollections,
  copyItem
} from '../utils/page';
import { listRequestFiles, findCollectionDir } from './utils';

const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
const saveShortcut = `${modifier}+s`;

test.describe('Naming collisions - double-paste race', () => {
  test.afterEach(async ({ page }) => {
    await page.keyboard.press('Escape');
    await closeAllCollections(page);
  });

  test('pasting twice in rapid succession yields distinct files with no error', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('race-double-paste');

    await createCollection(page, 'Race', testDir, 'bru');
    await createRequest(page, 'login', 'Race');
    await createFolder(page, 'Target', 'Race');

    await copyItem(page, 'login');

    await test.step('Focus the target folder and fire two pastes back-to-back', async () => {
      // Focusing the row enables the pasteItem keybinding for this item.
      await nc.itemRow('Target').focus();
      // Two presses without awaiting the resulting async paste IPCs — they overlap,
      // reproducing the original "path ... already exists" race condition.
      await page.keyboard.press(`${modifier}+v`);
      await page.keyboard.press(`${modifier}+v`);
    });

    await test.step('No error toast; two distinct files created in the folder', async () => {
      await expect(nc.toast(/already exists/i)).toHaveCount(0);
      const targetDir = path.join(findCollectionDir(testDir), 'Target');
      await expect
        .poll(() => listRequestFiles(targetDir).sort(), { timeout: 10000 })
        .toEqual(['login copy.bru', 'login copy1.bru']);
    });
  });
});

test.describe('Naming collisions - save transient request', () => {
  test.afterEach(async ({ page }) => {
    await page.keyboard.press('Escape');
    await closeAllCollections(page);
  });

  test('saving a transient request with an existing name silently suffixes the file', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('transient-save-collision');

    await createCollection(page, 'Transient Save', testDir, 'bru');
    await createRequest(page, 'login', 'Transient Save'); // login.bru already exists
    await createTransientRequest(page); // Untitled draft

    await test.step('Save the draft as the already-taken name "login"', async () => {
      await page.keyboard.press(saveShortcut);
      const saveModal = nc.saveRequestModal();
      await saveModal.waitFor({ state: 'visible' });

      await nc.saveRequestNameInput().clear();
      await nc.saveRequestNameInput().fill('login');
      await saveModal.getByRole('button', { name: 'Save' }).click();
      await saveModal.waitFor({ state: 'hidden' });
    });

    await test.step('Two "login" entries; filesystem name silently suffixed', async () => {
      await expect(nc.itemByTitle('login')).toHaveCount(2);
      const files = listRequestFiles(testDir);
      expect(files).toContain('login.bru');
      expect(files).toContain('login1.bru');
    });
  });
});
