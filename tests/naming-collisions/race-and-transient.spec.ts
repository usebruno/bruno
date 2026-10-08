import process from 'node:process';
import * as path from 'path';
import { test, expect } from '../../playwright';
import {
  buildCommonLocators,
  createCollection,
  createRequest,
  createFolder,
  createTransientRequest,
  saveTransientRequestAs,
  closeAllCollections,
  copyItem
} from '../utils/page';
import { listRequestFiles, findCollectionDir } from './utils';

const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

test.describe('Naming collisions - double-paste race', () => {
  test.afterEach(async ({ page }) => {
    await page.keyboard.press('Escape');
    await closeAllCollections(page);
  });

  test('pasting twice in rapid succession yields distinct files with no error', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const testDir = await createTmpDir('race-double-paste');

    await createCollection(page, 'Race', testDir, 'bru');
    await createRequest(page, 'login', 'Race');
    await createFolder(page, 'Target', 'Race');

    await copyItem(page, 'login');

    await test.step('Focus the target folder and fire two pastes back-to-back', async () => {
      // Focusing the row enables the pasteItem keybinding for this item.
      await sidebar.itemRow('Target').focus();

      await page.keyboard.press(`${modifier}+v`);
      await page.keyboard.press(`${modifier}+v`);
    });

    await test.step('No error toast; two distinct files created in the folder', async () => {
      const targetDir = path.join(findCollectionDir(testDir), 'Target');
      await expect
        .poll(() => listRequestFiles(targetDir).sort(), { timeout: 10000 })
        .toEqual(['login copy.bru', 'login copy 1.bru'].sort());

      await expect(page.getByText(/already exists/i)).toHaveCount(0);
    });
  });
});

test.describe('Naming collisions - save transient request', () => {
  test.afterEach(async ({ page }) => {
    await page.keyboard.press('Escape');
    await closeAllCollections(page);
  });

  test('saving a transient request with an existing name silently suffixes the file', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const testDir = await createTmpDir('transient-save-collision');

    await createCollection(page, 'Transient Save', testDir, 'bru');
    await createRequest(page, 'login', 'Transient Save'); // login.bru already exists
    await createTransientRequest(page); // Untitled draft

    await saveTransientRequestAs(page, 'login'); // save the draft as the already-taken name

    await test.step('Two "login" entries; filesystem name silently suffixed', async () => {
      await expect(sidebar.itemByName('login')).toHaveCount(2);
      const files = listRequestFiles(testDir);
      expect(files).toContain('login.bru');
      expect(files).toContain('login 1.bru');
    });
  });

  test('opens the newly-saved (suffixed) request, not the pre-existing one with the same name', async ({ page, createTmpDir }) => {
    const { sidebar, tabs } = buildCommonLocators(page);
    const testDir = await createTmpDir('transient-save-open-correct');

    await createCollection(page, 'Transient Open', testDir, 'bru');
    await createRequest(page, 'login', 'Transient Open', { method: 'POST' });
    await createTransientRequest(page); // Untitled draft (GET)

    await saveTransientRequestAs(page, 'login'); // collides with login.bru -> writes login 1.bru

    await test.step('The opened tab is the freshly-saved request (GET), not the pre-existing "login" (POST)', async () => {
      await expect(tabs.activeRequestTab()).toContainText('login');
      // the opened request should be the saved Transient Request which is GET.
      await expect(tabs.activeRequestTabMethod()).toContainText('GET');
    });

    await test.step('On disk: both files exist (display names collide, directory suffixed)', async () => {
      await expect(sidebar.itemByName('login')).toHaveCount(2);
      const files = listRequestFiles(testDir);
      expect(files).toContain('login.bru');
      expect(files).toContain('login 1.bru');
    });
  });
});
