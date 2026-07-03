import process from 'node:process';
import * as path from 'path';
import { test, expect, Page } from '../../playwright';
import { buildCommonLocators, createCollection, createRequest, createFolder, closeAllCollections } from '../utils/page';
import { listRequestFiles } from './utils';

const openNewRequestModal = async (page: Page, parentName: string, { inFolder = false } = {}) => {
  const locators = buildCommonLocators(page);
  if (inFolder) {
    await locators.sidebar.folder(parentName).hover();
    await locators.actions.collectionItemActions(parentName).click();
  } else {
    await locators.sidebar.collection(parentName).hover();
    const collectionAction = locators.actions.collectionActions(parentName);
    await expect(collectionAction).toBeVisible({ timeout: 5000 });
    await collectionAction.click();
  }
  await locators.dropdown.item('New Request').click();
};

const createRequestViaModal = async (page: Page, parentName: string, name: string, { inFolder = false } = {}) => {
  await openNewRequestModal(page, parentName, { inFolder });
  await page.getByPlaceholder('Request Name').fill(name);
  await page.getByTestId('create-new-request-button').click();
  await expect(page.locator('.bruno-modal')).toHaveCount(0, { timeout: 5000 });
};

const createRequestWithEditedFilename = async (
  page: Page,
  collectionName: string,
  displayName: string,
  filename: string
) => {
  await openNewRequestModal(page, collectionName);
  await page.getByPlaceholder('Request Name').fill(displayName);

  // Reveal the filesystem-name field, then switch it into edit mode.
  await page.locator('.advanced-options .btn-advanced').click();
  await page.locator('.dropdown-item').filter({ hasText: 'Show Filesystem Name' }).click();
  const fileNameRow = page
    .locator('.bruno-modal div.flex.items-center.justify-between')
    .filter({ has: page.getByText('File Name') });
  await fileNameRow.locator('> svg').click(); // IconEdit -> editable input

  await page.getByTestId('file-name').fill(filename);
  await page.getByTestId('create-new-request-button').click();
  await expect(page.locator('.bruno-modal')).toHaveCount(0, { timeout: 5000 });
};

test.describe('Naming collisions - create request', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('creating a request with an existing name keeps the name and suffixes the file', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('create-request-dup');

    await createCollection(page, 'Create Dup', testDir, 'bru');
    await createRequest(page, 'users', 'Create Dup');
    await createRequestViaModal(page, 'Create Dup', 'users');

    await test.step('Sidebar shows two "users" entries (duplicate display names allowed)', async () => {
      await expect(page.locator('.item-name[title="users"]')).toHaveCount(2);
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
    const locators = buildCommonLocators(page);
    const testDir = await createTmpDir('create-request-in-folder');

    await createCollection(page, 'Create In Folder', testDir, 'bru');
    await createFolder(page, 'Auth', 'Create In Folder');
    await locators.sidebar.folder('Auth').dblclick();
    await createRequest(page, 'login', 'Auth', { inFolder: true });
    await createRequestViaModal(page, 'Auth', 'login', { inFolder: true });

    await test.step('On disk: both files live under "Auth", second suffixed', async () => {
      const files = listRequestFiles(path.join(testDir, 'Create In Folder', 'Auth'));
      expect(files).toContain('login.bru');
      expect(files).toContain('login1.bru');
    });
  });

  test('manually-edited filename with no collision is used exactly as typed', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('create-request-edited-filename-free');

    await createCollection(page, 'Edit Filename Free', testDir, 'bru');

    await test.step('Create "My Login" with a custom, non-colliding filesystem name "signin"', async () => {
      await createRequestWithEditedFilename(page, 'Edit Filename Free', 'My Login', 'signin');
    });

    await test.step('Display name and the exact edited filename are both honoured', async () => {
      await expect(page.locator('.item-name[title="My Login"]')).toHaveCount(1);
      const files = listRequestFiles(testDir);
      expect(files).toContain('signin.bru'); // exactly as typed, no suffix
      expect(files).not.toContain('My Login.bru'); // display name was not used as the filename
    });
  });

  test('manually-edited filename that collides is silently suffixed, display name kept', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('create-request-edited-filename');

    await createCollection(page, 'Edit Filename', testDir, 'bru');
    await createRequest(page, 'login', 'Edit Filename'); // login.bru now exists

    await test.step('Create "My Login" but set its filesystem name to the existing "login"', async () => {
      await createRequestWithEditedFilename(page, 'Edit Filename', 'My Login', 'login');
    });

    await test.step('Display name is kept; filesystem name silently suffixed', async () => {
      await expect(page.locator('.item-name[title="My Login"]')).toHaveCount(1);
      const files = listRequestFiles(testDir);
      expect(files).toContain('login.bru');
      expect(files).toContain('login1.bru');
    });
  });

  test('creating with a reserved name is blocked and shows a validation error', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('create-request-reserved');

    await createCollection(page, 'Create Reserved', testDir, 'bru');

    const modal = page.locator('.bruno-modal');

    await test.step('Enter reserved name "CON", reveal filesystem name, submit', async () => {
      await openNewRequestModal(page, 'Create Reserved');
      await page.getByPlaceholder('Request Name').fill('CON');
      // Reveal the filesystem-name section so its validation error renders.
      await page.locator('.advanced-options .btn-advanced').click();
      await page.locator('.dropdown-item').filter({ hasText: 'Show Filesystem Name' }).click();
      await page.getByTestId('create-new-request-button').click();
    });

    await test.step('Reserved-name error is shown and nothing is created', async () => {
      await expect(page.getByText('Name cannot be a reserved device name.')).toBeVisible();
      await expect(modal).toBeVisible();
      expect(listRequestFiles(testDir)).toHaveLength(0);
    });

    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).toHaveCount(0, { timeout: 5000 });
  });

  test('creating a case-variant name behaves per filesystem case-sensitivity', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('create-case');

    await createCollection(page, 'Create Case', testDir, 'bru');
    await createRequest(page, 'login', 'Create Case'); // login.bru
    await createRequestViaModal(page, 'Create Case', 'Login'); // case variant

    await test.step('Both display names appear in the sidebar', async () => {
      await expect(page.locator('.item-name[title="login"]')).toHaveCount(1);
      await expect(page.locator('.item-name[title="Login"]')).toHaveCount(1);
    });

    await test.step('On disk: case-insensitive FS suffixes; case-sensitive FS coexists', async () => {
      const files = listRequestFiles(testDir);
      expect(files).toContain('login.bru');
      if (process.platform === 'linux') {
        // Case-sensitive: "Login.bru" is a distinct free name, no suffix.
        expect(files).toContain('Login.bru');
      } else {
        // Case-insensitive (macOS/Windows): "Login.bru" collides with "login.bru" -> suffixed.
        expect(files).toContain('Login1.bru');
      }
      expect(files).toHaveLength(2);
    });
  });
});
