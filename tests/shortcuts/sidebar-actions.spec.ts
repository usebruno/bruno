import { test, expect } from '../../playwright';
import { closeAllCollections, createFolder, openCollection } from '../utils/page';
import {
  modifier,
  collectionName,
  setupBoundActionsData,
  openRequest,
  openKeybindingsTab,
  closePreferencesTab,
  openFolderSettingsTab,
  remapKeybinding
} from './helpers';

// ─── Tests ────

test.describe('Shortcut Keys - BOUND_ACTIONS', () => {
  test.beforeEach(async ({ page, createTmpDir }) => {
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 5000 });
    await setupBoundActionsData(page, createTmpDir);
  });

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test.describe('SIDEBAR', () => {
    test.describe('SHORTCUT: Sidebar search (Cmd/Ctrl+F)', () => {
      test('Sidebar search default (Cmd/Ctrl+F)', async ({ page }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await page.keyboard.press(`${modifier}+KeyF`);

        // await expect(page.getByPlaceholder('Search requests...')).toBeVisible({ timeout: 3000 });
        await expect(page.getByTestId('sidebar-search-input')).toBeVisible({ timeout: 3000 });
        await page.getByTitle('Search requests').click();
      });

      test('Sidebar search customized (Alt+F)', async ({ page }) => {
        // Remap sidebarSearch to Alt+F
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-sidebarSearch');
        await row.hover();
        await page.getByTestId('keybinding-edit-sidebarSearch').click();
        await expect(page.getByTestId('keybinding-input-sidebarSearch')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyF');
        await page.keyboard.up('KeyF');
        await page.keyboard.up('Alt');

        // Press Cmd/Ctrl+T to open sidebar search
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyF');
        await page.keyboard.up('KeyF');
        await page.keyboard.up('Alt');

        await expect(page.getByTestId('sidebar-search-input')).toBeVisible({ timeout: 2000 });
        await page.getByTitle('Search requests').click();
      });
    });

    test.describe('SHORTCUT: New request (Cmd/Ctrl+N)', () => {
      test('New request default (Cmd/Ctrl+N)', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await page.locator('.collection-item-name').filter({ hasText: 'kb-folder' }).click();

        await page.keyboard.press(`${modifier}+KeyN`);

        await page.getByTestId('request-name').fill('nr-folder');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        await expect(page.locator('.request-tab').filter({ hasText: 'nr-folder' })).toBeVisible({ timeout: 2000 });
      });

      test('New request customized (Alt+N)', async ({ page, createTmpDir }) => {
        // Remap newRequest to Alt+N
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-newRequest');
        await row.hover();
        await page.getByTestId('keybinding-edit-newRequest').click();
        await expect(page.getByTestId('keybinding-input-newRequest')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyN');
        await page.keyboard.up('KeyN');
        await page.keyboard.up('Alt');

        await page.locator('.collection-name').filter({ hasText: 'kb-collection' }).click();

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyN');
        await page.keyboard.up('KeyN');
        await page.keyboard.up('Alt');

        await page.getByTestId('request-name').fill('nr-collection');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        await expect(page.locator('.request-tab').filter({ hasText: 'nr-collection' })).toBeVisible({ timeout: 2000 });
      });
    });

    test.describe('SHORTCUT: Rename Item', () => {
      test.describe('SHORTCUT: Rename Item for request (Cmd/Ctrl+R)', () => {
        test('default Cmd/Ctrl+R open rename item modal for request', async ({ page, createTmpDir }) => {
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyY');
          await page.keyboard.up('KeyY');
          await page.keyboard.up('Alt');

          await page.locator('.collection-name').filter({ hasText: 'kb-collection' }).dblclick();
          await openRequest(page, 'kb-collection', 'req-1', { persist: true });
          await page.keyboard.press(`${modifier}+KeyR`);

          // Verify rename modal opens
          const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename request/i });
          await expect(renameModal).toBeVisible({ timeout: 3000 });

          // Fill in the rename req name
          const requestNameInput = page.locator('#collection-item-name');
          await requestNameInput.fill('req-1-renamed');

          // Click the rename button
          await page.getByTestId('rename-item-button').click();

          // Verify renamed request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ hasText: 'req-1-renamed' })).toBeVisible({ timeout: 2000 });
        });
      });

      test.describe('SHORTCUT: Rename Item for folder (Cmd/Ctrl+R)', () => {
        test('default Cmd/Ctrl+R open rename item modal for folder', async ({ page, createTmpDir }) => {
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyY');
          await page.keyboard.up('KeyY');
          await page.keyboard.up('Alt');

          await page.locator('.collection-item-name').filter({ hasText: 'kb-folder' }).dblclick();
          await page.keyboard.press(`${modifier}+KeyR`);

          // Verify rename modal opens
          const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename folder/i });
          await expect(renameModal).toBeVisible({ timeout: 3000 });

          // Fill in the rename req name
          const folderNameInput = page.locator('#collection-item-name');
          await folderNameInput.fill('kb-folder-renamed');

          // Click the rename button
          await page.getByTestId('rename-item-button').click();

          // Verify renamed request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ hasText: 'kb-folder-renamed' })).toBeVisible({ timeout: 2000 });
        });
      });

      test.describe('SHORTCUT: Rename Item for collection (Cmd/Ctrl+R)', () => {
        test('default Cmd/Ctrl+R open rename item modal for collection', async ({ page, createTmpDir }) => {
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyY');
          await page.keyboard.up('KeyY');
          await page.keyboard.up('Alt');

          await page.locator('.collection-name').filter({ hasText: 'kb-collection' }).click();
          await page.keyboard.press(`${modifier}+KeyR`);

          // Verify rename modal opens
          const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename collection/i });
          await expect(renameModal).toBeVisible({ timeout: 3000 });

          // Fill in the rename req name
          const collectionInput = page.locator('#collection-name');
          await collectionInput.fill('kb-collection-renamed');

          // Click the rename button
          await page.locator('.submit').click();

          // Verify renamed request appears in sidebar
          await expect(page.locator('.collection-name').filter({ hasText: 'kb-collection-renamed' })).toBeVisible({ timeout: 3000 });
        });
      });

      test.describe('SHORTCUT: Rename Item for request (customized Alt+X)', () => {
        test('customized Alt+X open rename item modal for request', async ({ page, createTmpDir }) => {
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyY');
          await page.keyboard.up('KeyY');
          await page.keyboard.up('Alt');

          // Remap renameItem to Alt+R
          await openKeybindingsTab(page);
          const row = page.getByTestId('keybinding-row-renameItem');
          await row.hover();
          await page.getByTestId('keybinding-edit-renameItem').click();
          await expect(page.getByTestId('keybinding-input-renameItem')).toBeVisible({ timeout: 2000 });

          await page.keyboard.down('Backspace');

          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyX');
          await page.keyboard.up('KeyX');
          await page.keyboard.up('Alt');

          await openRequest(page, collectionName, 'req-1', { persist: true });
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyX');
          await page.keyboard.up('KeyX');
          await page.keyboard.up('Alt');

          // Verify rename modal opens
          const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename request/i });
          await expect(renameModal).toBeVisible({ timeout: 3000 });

          // Fill in the rename req name
          const requestNameInput = page.locator('#collection-item-name');
          await requestNameInput.fill('req-1-renamed-altx');

          // Click the rename button
          await page.getByTestId('rename-item-button').click();

          // Verify renamed request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ hasText: 'req-1-renamed-altx' })).toBeVisible({ timeout: 2000 });
        });
      });

      test.describe('SHORTCUT: Rename Item for folder (customized Alt+X)', () => {
        test('customized Alt+R open rename item modal for folder', async ({ page, createTmpDir }) => {
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyY');
          await page.keyboard.up('KeyY');
          await page.keyboard.up('Alt');

          await remapKeybinding(page, 'renameItem', async () => {
            await page.keyboard.press('Alt+KeyX');
          });

          await createFolder(page, 'kb-folder-rename-src', collectionName, true);
          await openFolderSettingsTab(page, 'kb-folder-rename-src');
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyX');
          await page.keyboard.up('KeyX');
          await page.keyboard.up('Alt');

          // Verify rename modal opens
          const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename folder/i });
          await expect(renameModal).toBeVisible({ timeout: 3000 });

          // Fill in the rename req name
          const folderNameInput = page.locator('#collection-item-name');
          await folderNameInput.fill('kb-folder-renamed-altx-src');

          // Click the rename button
          await page.getByTestId('rename-item-button').click();

          // Verify renamed request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ hasText: 'kb-folder-renamed-altx-src' })).toBeVisible({ timeout: 2000 });
        });
      });

      test.describe('SHORTCUT: Rename Item for collection (customized Alt+X)', () => {
        test('customized Alt+R open rename item modal for collection', async ({ page, createTmpDir }) => {
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyY');
          await page.keyboard.up('KeyY');
          await page.keyboard.up('Alt');

          await remapKeybinding(page, 'renameItem', async () => {
            await page.keyboard.press('Alt+KeyX');
          });

          await page.locator('.collection-name').filter({ hasText: collectionName }).click();
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyX');
          await page.keyboard.up('KeyX');
          await page.keyboard.up('Alt');

          // Verify rename modal opens
          const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename collection/i });
          await expect(renameModal).toBeVisible({ timeout: 3000 });

          // Fill in the rename req name
          const collectionInput = page.locator('#collection-name');
          await collectionInput.fill('kb-collection-renamed-altx');

          // Click the rename button
          await page.locator('.submit').click();

          // Verify renamed request appears in sidebar
          await expect(page.locator('.collection-name').filter({ hasText: 'kb-collection-renamed-altx' })).toBeVisible({ timeout: 2000 });
        });
      });
    });

    test.describe('SHORTCUT: Clone Item', () => {
      test.describe('SHORTCUT: Clone Item for request (Cmd/Ctrl+D)', () => {
        test('default Cmd/Ctrl+D open clone item modal for request', async ({ page, createTmpDir }) => {
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyY');
          await page.keyboard.up('KeyY');
          await page.keyboard.up('Alt');

          await openRequest(page, 'kb-collection', 'req-1', { persist: true });
          await page.keyboard.press(`${modifier}+KeyD`);

          // Verify clone modal opens
          const cloneModal = page.locator('.bruno-modal-card').filter({ hasText: /clone request/i });
          await expect(cloneModal).toBeVisible({ timeout: 3000 });

          // Fill in the clone req name
          const requestNameInput = page.locator('#collection-item-name');
          await requestNameInput.fill('req-1 clone 1');

          // Click the clone button
          await page.getByTestId('clone-item-button').click();

          // Verify cloned request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ hasText: 'req-1 clone 1' })).toBeVisible({ timeout: 2000 });
        });
      });

      test.describe('SHORTCUT: Clone Item for folder (Cmd/Ctrl+D)', () => {
        test('default Cmd/Ctrl+D open clone item modal for folder', async ({ page, createTmpDir }) => {
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyY');
          await page.keyboard.up('KeyY');
          await page.keyboard.up('Alt');

          await page.locator('.collection-item-name').filter({ hasText: 'kb-folder' }).dblclick();
          await page.keyboard.press(`${modifier}+KeyD`);

          // Verify clone modal opens
          const cloneModal = page.locator('.bruno-modal-card').filter({ hasText: /clone folder/i });
          await expect(cloneModal).toBeVisible({ timeout: 3000 });

          // Fill in the clone kb-folder name
          const folderNameInput = page.locator('#collection-item-name');
          await folderNameInput.fill('kb-folder clone 1');

          // Click the clone button
          await page.getByTestId('clone-item-button').click();

          // Verify cloned request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ hasText: 'kb-folder clone 1' })).toBeVisible({ timeout: 2000 });
        });
      });

      test.describe('SHORTCUT: Clone Item for request (customized Alt+D)', () => {
        test('customized Alt+D open clone item modal for request', async ({ page, createTmpDir }) => {
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyY');
          await page.keyboard.up('KeyY');
          await page.keyboard.up('Alt');

          // Remap cloneItem to Alt+D
          await openKeybindingsTab(page);
          const row = page.getByTestId('keybinding-row-cloneItem');
          await row.hover();
          await page.getByTestId('keybinding-edit-cloneItem').click();
          await expect(page.getByTestId('keybinding-input-cloneItem')).toBeVisible({ timeout: 2000 });

          await page.keyboard.down('Backspace');

          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyD');
          await page.keyboard.up('KeyD');
          await page.keyboard.up('Alt');

          await openRequest(page, 'kb-collection', 'req-2', { persist: true });

          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyD');
          await page.keyboard.up('KeyD');
          await page.keyboard.up('Alt');

          // Verify clone modal opens
          const cloneModal = page.locator('.bruno-modal-card').filter({ hasText: /clone request/i });
          await expect(cloneModal).toBeVisible({ timeout: 3000 });

          // Fill in the clone req name
          const requestNameInput = page.locator('#collection-item-name');
          await requestNameInput.fill('req-2 clone 1');

          // Click the clone button
          await page.getByTestId('clone-item-button').click();

          // Verify renamed request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ hasText: 'req-2 clone 1' })).toBeVisible({ timeout: 2000 });
        });
      });

      test.describe('SHORTCUT: Clone Item for folder (customized Alt+D)', () => {
        test('customized Alt+D open clone item modal for folder', async ({ page, createTmpDir }) => {
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyY');
          await page.keyboard.up('KeyY');
          await page.keyboard.up('Alt');

          await createFolder(page, 'kb-folder-clone-src', collectionName, true);
          await openCollection(page, collectionName);
          await page.locator('.collection-item-name').filter({ hasText: 'kb-folder-clone-src' }).first().click();
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyD');
          await page.keyboard.up('KeyD');
          await page.keyboard.up('Alt');

          // Verify clone modal opens
          const cloneModal = page.locator('.bruno-modal-card').filter({ hasText: /clone folder/i });
          await expect(cloneModal).toBeVisible({ timeout: 3000 });

          // Fill in the clone req name
          const folderNameInput = page.locator('#collection-item-name');
          await folderNameInput.fill('kb-folder-clone-src copy 1');

          // Click the clone button
          await page.getByTestId('clone-item-button').click();

          // Verify renamed request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ hasText: 'kb-folder-clone-src copy 1' })).toBeVisible({ timeout: 2000 });
        });
      });
    });

    test.describe('SHORTCUT: Copy Paste Item', () => {
      test.describe('SHORTCUT: Copy Paste Item for request (Cmd/Ctrl+C/V)', () => {
        test('default Cmd/Ctrl+C/V copy paste item for request', async ({ page, createTmpDir }) => {
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyY');
          await page.keyboard.up('KeyY');
          await page.keyboard.up('Alt');

          await openRequest(page, 'kb-collection', 'req-3', { persist: true });
          await page.keyboard.press(`${modifier}+KeyC`);
          await page.keyboard.press(`${modifier}+KeyV`);

          // Verify cloned request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ hasText: 'req-3 (1)' })).toBeVisible({ timeout: 2000 });
        });
      });

      test.describe('SHORTCUT: Copy Paste Item for folder (Cmd/Ctrl+C/V)', () => {
        test('default Cmd/Ctrl+C/V copy paste item for folder', async ({ page }) => {
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyY');
          await page.keyboard.up('KeyY');
          await page.keyboard.up('Alt');

          await openRequest(page, collectionName, 'kb-folder', { persist: true });
          await page.keyboard.press(`${modifier}+KeyC`);
          await page.keyboard.press(`${modifier}+KeyV`);

          // Verify copied item appears in sidebar as child of folder
          await expect(page.locator('.collection-item-name').filter({ hasText: 'kb-folder' })).toHaveCount(2);
        });
      });

      test.describe('SHORTCUT: Copy Paste Item for request (customized Alt+C/V)', () => {
        test('customized Alt+C/V copy paste item for request', async ({ page, createTmpDir }) => {
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyY');
          await page.keyboard.up('KeyY');
          await page.keyboard.up('Alt');

          // Remap copyItem to Alt+D
          await openKeybindingsTab(page);
          const row = page.getByTestId('keybinding-row-copyItem');
          await row.hover();
          await page.getByTestId('keybinding-edit-copyItem').click();
          await expect(page.getByTestId('keybinding-input-copyItem')).toBeVisible({ timeout: 2000 });

          await page.keyboard.down('Backspace');

          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyC');
          await page.keyboard.up('KeyC');
          await page.keyboard.up('Alt');

          // Remap pasteItem to Alt+V
          await openKeybindingsTab(page);
          const row2 = page.getByTestId('keybinding-row-pasteItem');
          await row2.hover();
          await page.getByTestId('keybinding-edit-pasteItem').click();
          await expect(page.getByTestId('keybinding-input-pasteItem')).toBeVisible({ timeout: 2000 });

          await page.keyboard.down('Backspace');

          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyV');
          await page.keyboard.up('KeyV');
          await page.keyboard.up('Alt');

          await openRequest(page, 'kb-collection', 'req-4', { persist: true });
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyC');
          await page.keyboard.up('KeyC');
          await page.keyboard.up('Alt');

          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyV');
          await page.keyboard.up('KeyV');
          await page.keyboard.up('Alt');

          // Verify cloned request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ hasText: 'req-4 (1)' })).toBeVisible({ timeout: 2000 });
        });
      });

      test.describe('SHORTCUT: Copy Paste Item for folder (Cmd/Ctrl+C/V)', () => {
        test('customized Alt+C/V copy paste item for folder', async ({ page, createTmpDir }) => {
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyY');
          await page.keyboard.up('KeyY');
          await page.keyboard.up('Alt');

          await remapKeybinding(page, 'copyItem', async () => {
            await page.keyboard.press('Alt+KeyC');
          });
          await remapKeybinding(page, 'pasteItem', async () => {
            await page.keyboard.press('Alt+KeyV');
          });

          await createFolder(page, 'kb-folder-copy-src', collectionName, true);
          await openFolderSettingsTab(page, 'kb-folder-copy-src');
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyC');
          await page.keyboard.up('KeyC');
          await page.keyboard.up('Alt');

          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyV');
          await page.keyboard.up('KeyV');
          await page.keyboard.up('Alt');

          // Verify copied item appears in sidebar as child of folder
          await expect(page.locator('.collection-item-name').filter({ hasText: 'kb-folder-copy-src' })).toHaveCount(2);
        });
      });
    });

    test.describe('SHORTCUT: Collapse Sidebar', () => {
      test('Collapse sidebar & Expand using default Cmd/Ctrl+\\', async ({ page, createTmpDir }) => {
        await expect(page.getByTestId('collections')).toBeVisible();
        await page.locator('body').click({ position: { x: 1, y: 1 } });

        // Press Cmd/Ctrl+\ to collapse sidebar
        await page.keyboard.press(`${modifier}+Backslash`);

        // Verify sidebar collapsed to 0px
        await expect.poll(
          () => page.locator('aside.sidebar').evaluate((el) => getComputedStyle(el).width),
          { timeout: 5000 }
        ).toBe('0px');

        // Press Cmd/Ctrl+\ to expand sidebar
        await page.keyboard.press(`${modifier}+Backslash`);

        // Verify sidebar expanded to 250px
        await expect.poll(
          () => page.locator('aside.sidebar').evaluate((el) => getComputedStyle(el).width),
          { timeout: 5000 }
        ).toBe('250px');
      });

      test('Collapse sidebar & Expand using customized (Shift+G)', async ({ page, createTmpDir }) => {
        // Remap collapseSidebar to Shift+G
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-collapseSidebar');
        await row.hover();
        await page.getByTestId('keybinding-edit-collapseSidebar').click();
        await expect(page.getByTestId('keybinding-input-collapseSidebar')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyG');
        await page.keyboard.up('KeyG');
        await page.keyboard.up('Shift');

        await closePreferencesTab(page);

        // Trigger the remapped shortcut to collapse sidebar
        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyG');
        await page.keyboard.up('KeyG');
        await page.keyboard.up('Shift');

        // Verify sidebar collapsed to 0px
        await expect.poll(
          () => page.locator('aside.sidebar').evaluate((el) => getComputedStyle(el).width),
          { timeout: 5000 }
        ).toBe('0px');

        // Trigger the remapped shortcut to expand sidebar
        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyG');
        await page.keyboard.up('KeyG');
        await page.keyboard.up('Shift');

        // Verify sidebar expanded to 250px
        await expect.poll(
          () => page.locator('aside.sidebar').evaluate((el) => getComputedStyle(el).width),
          { timeout: 5000 }
        ).toBe('250px');
      });
    });
  });
});
