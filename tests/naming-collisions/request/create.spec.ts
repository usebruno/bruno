import process from 'node:process';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  createCollection,
  createRequest,
  createFolder,
  closeAllCollections,
  openNewRequestModal,
  createRequestViaModal,
  createRequestWithEditedFilename,
  revealFilesystemName
} from '../../utils/page';
import { listRequestFiles } from '../utils';

test.describe('Naming collisions - create request', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('creating a request with an existing name keeps the name and suffixes the file', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('create-request-dup');

    await createCollection(page, 'Create Dup', testDir, 'bru');
    await createRequest(page, 'users', 'Create Dup');
    await createRequestViaModal(page, 'Create Dup', 'users');

    await test.step('Sidebar shows two "users" entries (duplicate display names allowed)', async () => {
      await expect(nc.itemByTitle('users')).toHaveCount(2);
    });

    await test.step('On disk: typed name preserved, second file silently suffixed', async () => {
      const files = listRequestFiles(testDir);
      expect(files).toContain('users.bru');
      expect(files).toContain('users1.bru');
    });
  });

  test('creating a request with an existing name in a yml collection suffixes the .yml file', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('create-request-dup-yml');

    await createCollection(page, 'Create Dup Yml', testDir, 'yml');
    await createRequest(page, 'users', 'Create Dup Yml');
    await createRequestViaModal(page, 'Create Dup Yml', 'users');

    await test.step('On disk: both files are .yml, second silently suffixed', async () => {
      const files = listRequestFiles(testDir, '.yml');
      expect(files).toContain('users.yml');
      expect(files).toContain('users1.yml');
    });
  });

  test('creating a duplicate name inside a folder suffixes within that folder', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const testDir = await createTmpDir('create-request-in-folder');

    await createCollection(page, 'Create In Folder', testDir, 'bru');
    await createFolder(page, 'Auth', 'Create In Folder');
    await sidebar.folder('Auth').dblclick();
    await createRequest(page, 'login', 'Auth', { inFolder: true });
    await createRequestViaModal(page, 'Auth', 'login', { inFolder: true });

    await test.step('On disk: both files live under "Auth", second suffixed', async () => {
      const files = listRequestFiles(path.join(testDir, 'Create In Folder', 'Auth'));
      expect(files).toContain('login.bru');
      expect(files).toContain('login1.bru');
    });
  });

  test('manually-edited filename with no collision is used exactly as typed', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('create-request-edited-filename-free');

    await createCollection(page, 'Edit Filename Free', testDir, 'bru');
    await createRequestWithEditedFilename(page, 'Edit Filename Free', 'My Login', 'signin');

    await test.step('Display name and the exact edited filename are both honoured', async () => {
      await expect(nc.itemByTitle('My Login')).toHaveCount(1);
      const files = listRequestFiles(testDir);
      expect(files).toContain('signin.bru'); // exactly as typed, no suffix
      expect(files).not.toContain('My Login.bru'); // display name was not used as the filename
    });
  });

  test('manually-edited filename that collides is silently suffixed, display name kept', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('create-request-edited-filename');

    await createCollection(page, 'Edit Filename', testDir, 'bru');
    await createRequest(page, 'login', 'Edit Filename'); // login.bru now exists
    await createRequestWithEditedFilename(page, 'Edit Filename', 'My Login', 'login');

    await test.step('Display name is kept; filesystem name silently suffixed', async () => {
      await expect(nc.itemByTitle('My Login')).toHaveCount(1);
      const files = listRequestFiles(testDir);
      expect(files).toContain('login.bru');
      expect(files).toContain('login1.bru');
    });
  });

  test('creating with a reserved name is blocked and shows a validation error', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('create-request-reserved');

    await createCollection(page, 'Create Reserved', testDir, 'bru');

    await test.step('Enter reserved name "CON", reveal filesystem name, submit', async () => {
      await openNewRequestModal(page, 'Create Reserved');
      await nc.requestNameInput().fill('CON');
      await revealFilesystemName(page);
      await nc.createRequestButton().click();
    });

    await test.step('Reserved-name error is shown and nothing is created', async () => {
      await expect(nc.toast('Name cannot be a reserved device name.')).toBeVisible();
      await expect(nc.anyModal()).toBeVisible();
      expect(listRequestFiles(testDir)).toHaveLength(0);
    });

    await nc.anyModal().getByRole('button', { name: 'Cancel' }).click();
    await expect(nc.anyModal()).toHaveCount(0, { timeout: 5000 });
  });

  test('creating a case-variant name behaves per filesystem case-sensitivity', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('create-case');

    await createCollection(page, 'Create Case', testDir, 'bru');
    await createRequest(page, 'login', 'Create Case'); // login.bru
    await createRequestViaModal(page, 'Create Case', 'Login'); // case variant

    await test.step('Both display names appear in the sidebar', async () => {
      await expect(nc.itemByTitle('login')).toHaveCount(1);
      await expect(nc.itemByTitle('Login')).toHaveCount(1);
    });

    await test.step('On disk: case-insensitive FS suffixes; case-sensitive FS coexists', async () => {
      const files = listRequestFiles(testDir);
      expect(files).toContain('login.bru');
      if (process.platform === 'linux') {
        expect(files).toContain('Login.bru'); // distinct free name, no suffix
      } else {
        expect(files).toContain('Login1.bru'); // collides case-insensitively -> suffixed
      }
      expect(files).toHaveLength(2);
    });
  });
});
