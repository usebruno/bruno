import { expect, test } from '../../playwright';
import { closeAllCollections, createFolder, openCollection } from '../utils/page';
import {
  closePreferencesTab,
  collectionName,
  modifier,
  openFolderSettingsTab,
  openKeybindingsTab,
  openRequest,
  pressShortcut,
  remapKeybinding,
  resetKeybindings,
  setupBoundActionsData
} from './helpers';

test.describe('Shortcut Keys - BOUND_ACTIONS', () => {
  test.beforeEach(async ({ pageWithUserData: page, createTmpDir }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
    await setupBoundActionsData(page, createTmpDir);
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    await resetKeybindings(page);
    await closeAllCollections(page);
  });

  test.describe('SIDEBAR', () => {
    test.describe('SHORTCUT: Sidebar search (Cmd/Ctrl+F)', () => {
      test('Sidebar search default (Cmd/Ctrl+F)', async ({ pageWithUserData: page }) => {
        await pressShortcut(page, modifier, 'KeyF');

        await expect(page.getByTestId('sidebar-search-input')).toBeVisible();
        await page.getByTitle('Search requests').click();
      });

      test('Sidebar search customized (Alt+F)', async ({ pageWithUserData: page }) => {
        // Remap sidebarSearch to Alt+F
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-sidebarSearch');
        await row.hover();
        await page.getByTestId('keybinding-edit-sidebarSearch').click();
        await expect(page.getByTestId('keybinding-input-sidebarSearch')).toBeVisible();

        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Alt', 'KeyF');

        await closePreferencesTab(page);

        await pressShortcut(page, 'Alt', 'KeyF');

        await expect(page.getByTestId('sidebar-search-input')).toBeVisible();
        await page.getByTitle('Search requests').click();
      });
    });

    test.describe('SHORTCUT: New request (Cmd/Ctrl+N)', () => {
      test('New request default (Cmd/Ctrl+N)', async ({ pageWithUserData: page }) => {
        await page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder', { exact: true }) }).click();

        await pressShortcut(page, modifier, 'KeyN');

        await page.getByTestId('request-name').fill('nr-folder');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        await expect(page.locator('.request-tab').filter({ has: page.getByText('nr-folder', { exact: true }) })).toBeVisible();
      });

      test('New request customized (Alt+N)', async ({ pageWithUserData: page }) => {
        // Remap newRequest to Alt+N
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-newRequest');
        await row.hover();
        await page.getByTestId('keybinding-edit-newRequest').click();
        await expect(page.getByTestId('keybinding-input-newRequest')).toBeVisible();

        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Alt', 'KeyN');

        await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText('kb-collection', { exact: true }) }).click();

        await pressShortcut(page, 'Alt', 'KeyN');

        await page.getByTestId('request-name').fill('nr-collection');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        await expect(page.locator('.request-tab').filter({ has: page.getByText('nr-collection', { exact: true }) })).toBeVisible();
      });
    });

    test.describe('SHORTCUT: Rename Item', () => {
      test.describe('SHORTCUT: Rename Item for request (Cmd/Ctrl+R)', () => {
        test('default Cmd/Ctrl+R open rename item modal for request', async ({ pageWithUserData: page }) => {
          await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText('kb-collection', { exact: true }) }).dblclick();
          await openRequest(page, 'kb-collection', 'req-1', { persist: true });
          await pressShortcut(page, modifier, 'KeyR');

          // Verify rename modal opens
          const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename request/i });
          await expect(renameModal).toBeVisible();

          // Fill in the rename req name
          const requestNameInput = page.locator('#collection-item-name');
          await requestNameInput.fill('req-1-renamed');

          // Click the rename button
          await page.getByTestId('rename-item-button').click();

          // Verify renamed request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('req-1-renamed', { exact: true }) })).toBeVisible();
        });
      });

      test.describe('SHORTCUT: Rename Item for folder (Cmd/Ctrl+R)', () => {
        test('default Cmd/Ctrl+R open rename item modal for folder', async ({ pageWithUserData: page }) => {
          await page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder', { exact: true }) }).dblclick();
          await pressShortcut(page, modifier, 'KeyR');

          // Verify rename modal opens
          const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename folder/i });
          await expect(renameModal).toBeVisible();

          // Fill in the rename req name
          const folderNameInput = page.locator('#collection-item-name');
          await folderNameInput.fill('kb-folder-renamed');

          // Click the rename button
          await page.getByTestId('rename-item-button').click();

          // Verify renamed request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder-renamed', { exact: true }) })).toBeVisible();
        });
      });

      test.describe('SHORTCUT: Rename Item for collection (Cmd/Ctrl+R)', () => {
        test('default Cmd/Ctrl+R open rename item modal for collection', async ({ pageWithUserData: page }) => {
          await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText('kb-collection', { exact: true }) }).click();
          await pressShortcut(page, modifier, 'KeyR');

          // Verify rename modal opens
          const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename collection/i });
          await expect(renameModal).toBeVisible();

          // Fill in the rename req name
          const collectionInput = page.locator('#collection-name');
          await collectionInput.fill('kb-collection-renamed');

          // Click the rename button
          await page.locator('.submit').click();

          // Verify renamed request appears in sidebar
          await expect(page.getByTestId('sidebar-collection-row').filter({ has: page.getByText('kb-collection-renamed', { exact: true }) })).toBeVisible();
        });
      });

      test.describe('SHORTCUT: Rename Item for request (customized Alt+X)', () => {
        test('customized Alt+X open rename item modal for request', async ({ pageWithUserData: page }) => {
          // Remap renameItem to Alt+R
          await openKeybindingsTab(page);
          const row = page.getByTestId('keybinding-row-renameItem');
          await row.hover();
          await page.getByTestId('keybinding-edit-renameItem').click();
          await expect(page.getByTestId('keybinding-input-renameItem')).toBeVisible();

          await page.keyboard.press('Backspace');

          await pressShortcut(page, 'Alt', 'KeyX');

          await openRequest(page, collectionName, 'req-1', { persist: true });
          await pressShortcut(page, 'Alt', 'KeyX');

          // Verify rename modal opens
          const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename request/i });
          await expect(renameModal).toBeVisible();

          // Fill in the rename req name
          const requestNameInput = page.locator('#collection-item-name');
          await requestNameInput.fill('req-1-renamed-altx');

          // Click the rename button
          await page.getByTestId('rename-item-button').click();

          // Verify renamed request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('req-1-renamed-altx', { exact: true }) })).toBeVisible();
        });
      });

      test.describe('SHORTCUT: Rename Item for folder (customized Alt+X)', () => {
        test('customized Alt+R open rename item modal for folder', async ({ pageWithUserData: page }) => {
          await remapKeybinding(page, 'renameItem', 'Alt', 'KeyX');

          await createFolder(page, 'kb-folder-rename-src', collectionName, true);
          await openFolderSettingsTab(page, 'kb-folder-rename-src');
          await pressShortcut(page, 'Alt', 'KeyX');

          // Verify rename modal opens
          const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename folder/i });
          await expect(renameModal).toBeVisible();

          // Fill in the rename req name
          const folderNameInput = page.locator('#collection-item-name');
          await folderNameInput.fill('kb-folder-renamed-altx-src');

          // Click the rename button
          await page.getByTestId('rename-item-button').click();

          // Verify renamed request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder-renamed-altx-src', { exact: true }) })).toBeVisible();
        });
      });

      test.describe('SHORTCUT: Rename Item for collection (customized Alt+X)', () => {
        test('customized Alt+R open rename item modal for collection', async ({ pageWithUserData: page }) => {
          await remapKeybinding(page, 'renameItem', 'Alt', 'KeyX');

          await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText(collectionName, { exact: true }) }).click();
          await pressShortcut(page, 'Alt', 'KeyX');

          // Verify rename modal opens
          const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename collection/i });
          await expect(renameModal).toBeVisible();

          // Fill in the rename req name
          const collectionInput = page.locator('#collection-name');
          await collectionInput.fill('kb-collection-renamed-altx');

          // Click the rename button
          await page.locator('.submit').click();

          // Verify renamed request appears in sidebar
          await expect(page.getByTestId('sidebar-collection-row').filter({ has: page.getByText('kb-collection-renamed-altx', { exact: true }) })).toBeVisible();
        });
      });
    });

    test.describe('SHORTCUT: Clone Item', () => {
      test.describe('SHORTCUT: Clone Item for request (Cmd/Ctrl+D)', () => {
        test('default Cmd/Ctrl+D open clone item modal for request', async ({ pageWithUserData: page }) => {
          await openRequest(page, 'kb-collection', 'req-1', { persist: true });
          await pressShortcut(page, modifier, 'KeyD');

          // Verify clone modal opens
          const cloneModal = page.locator('.bruno-modal-card').filter({ hasText: /clone request/i });
          await expect(cloneModal).toBeVisible();

          // Fill in the clone req name
          const requestNameInput = page.locator('#collection-item-name');
          await requestNameInput.fill('req-1 clone 1');

          // Click the clone button
          await page.getByTestId('clone-item-button').click();

          // Verify cloned request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('req-1 clone 1', { exact: true }) })).toBeVisible();
        });
      });

      test.describe('SHORTCUT: Clone Item for folder (Cmd/Ctrl+D)', () => {
        test('default Cmd/Ctrl+D open clone item modal for folder', async ({ pageWithUserData: page }) => {
          await page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder', { exact: true }) }).dblclick();
          await pressShortcut(page, modifier, 'KeyD');

          // Verify clone modal opens
          const cloneModal = page.locator('.bruno-modal-card').filter({ hasText: /clone folder/i });
          await expect(cloneModal).toBeVisible();

          // Fill in the clone kb-folder name
          const folderNameInput = page.locator('#collection-item-name');
          await folderNameInput.fill('kb-folder clone 1');

          // Click the clone button
          await page.getByTestId('clone-item-button').click();

          // Verify cloned request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder clone 1', { exact: true }) })).toBeVisible();
        });
      });

      test.describe('SHORTCUT: Clone Item for request (customized Alt+D)', () => {
        test('customized Alt+D open clone item modal for request', async ({ pageWithUserData: page }) => {
          // Remap cloneItem to Alt+D
          await openKeybindingsTab(page);
          const row = page.getByTestId('keybinding-row-cloneItem');
          await row.hover();
          await page.getByTestId('keybinding-edit-cloneItem').click();
          await expect(page.getByTestId('keybinding-input-cloneItem')).toBeVisible();

          await page.keyboard.press('Backspace');

          await pressShortcut(page, 'Alt', 'KeyD');

          await openRequest(page, 'kb-collection', 'req-2', { persist: true });

          await pressShortcut(page, 'Alt', 'KeyD');

          // Verify clone modal opens
          const cloneModal = page.locator('.bruno-modal-card').filter({ hasText: /clone request/i });
          await expect(cloneModal).toBeVisible();

          // Fill in the clone req name
          const requestNameInput = page.locator('#collection-item-name');
          await requestNameInput.fill('req-2 clone 1');

          // Click the clone button
          await page.getByTestId('clone-item-button').click();

          // Verify renamed request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('req-2 clone 1', { exact: true }) })).toBeVisible();
        });
      });

      test.describe('SHORTCUT: Clone Item for folder (customized Alt+D)', () => {
        test('customized Alt+D open clone item modal for folder', async ({ pageWithUserData: page }) => {
          // Remap cloneItem to Alt+D (keybindings are reset after each test, so re-bind here).
          await remapKeybinding(page, 'cloneItem', 'Alt', 'KeyD');
          await closePreferencesTab(page);

          await createFolder(page, 'kb-folder-clone-src', collectionName, true);
          await openCollection(page, collectionName);
          await page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder-clone-src', { exact: true }) }).first().click();
          await pressShortcut(page, 'Alt', 'KeyD');

          // Verify clone modal opens
          const cloneModal = page.locator('.bruno-modal-card').filter({ hasText: /clone folder/i });
          await expect(cloneModal).toBeVisible();

          // Fill in the clone req name
          const folderNameInput = page.locator('#collection-item-name');
          await folderNameInput.fill('kb-folder-clone-src copy 1');

          // Click the clone button
          await page.getByTestId('clone-item-button').click();

          // Verify renamed request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder-clone-src copy 1', { exact: true }) })).toBeVisible();
        });
      });
    });

    test.describe('SHORTCUT: Copy Paste Item', () => {
      test.describe('SHORTCUT: Copy Paste Item for request (Cmd/Ctrl+C/V)', () => {
        test('default Cmd/Ctrl+C/V copy paste item for request', async ({ pageWithUserData: page }) => {
          await openRequest(page, 'kb-collection', 'req-3', { persist: true });
          await pressShortcut(page, modifier, 'KeyC');
          await pressShortcut(page, modifier, 'KeyV');

          // Verify cloned request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('req-3 (1)', { exact: true }) })).toBeVisible();
        });
      });

      test.describe('SHORTCUT: Copy Paste Item for folder (Cmd/Ctrl+C/V)', () => {
        test('default Cmd/Ctrl+C/V copy paste item for folder', async ({ pageWithUserData: page }) => {
          await openRequest(page, collectionName, 'kb-folder', { persist: true });
          await pressShortcut(page, modifier, 'KeyC');
          await pressShortcut(page, modifier, 'KeyV');

          // Verify copied item appears in sidebar as child of folder
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder', { exact: true }) })).toHaveCount(2);
        });
      });

      test.describe('SHORTCUT: Copy Paste Item for request (customized Alt+C/V)', () => {
        test('customized Alt+C/V copy paste item for request', async ({ pageWithUserData: page }) => {
          // Remap copyItem to Alt+D
          await openKeybindingsTab(page);
          const row = page.getByTestId('keybinding-row-copyItem');
          await row.hover();
          await page.getByTestId('keybinding-edit-copyItem').click();
          await expect(page.getByTestId('keybinding-input-copyItem')).toBeVisible();

          await page.keyboard.press('Backspace');

          await pressShortcut(page, 'Alt', 'KeyC');

          // Remap pasteItem to Alt+V
          await openKeybindingsTab(page);
          const row2 = page.getByTestId('keybinding-row-pasteItem');
          await row2.hover();
          await page.getByTestId('keybinding-edit-pasteItem').click();
          await expect(page.getByTestId('keybinding-input-pasteItem')).toBeVisible();

          await page.keyboard.press('Backspace');

          await pressShortcut(page, 'Alt', 'KeyV');

          await openRequest(page, 'kb-collection', 'req-4', { persist: true });
          await pressShortcut(page, 'Alt', 'KeyC');

          await pressShortcut(page, 'Alt', 'KeyV');

          // Verify cloned request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('req-4 (1)', { exact: true }) })).toBeVisible();
        });
      });

      test.describe('SHORTCUT: Copy Paste Item for folder (Cmd/Ctrl+C/V)', () => {
        test('customized Alt+C/V copy paste item for folder', async ({ pageWithUserData: page }) => {
          await remapKeybinding(page, 'copyItem', 'Alt', 'KeyC');
          await remapKeybinding(page, 'pasteItem', 'Alt', 'KeyV');

          await createFolder(page, 'kb-folder-copy-src', collectionName, true);
          await openFolderSettingsTab(page, 'kb-folder-copy-src');
          await pressShortcut(page, 'Alt', 'KeyC');

          await pressShortcut(page, 'Alt', 'KeyV');

          // Verify copied item appears in sidebar as child of folder
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder-copy-src', { exact: true }) })).toHaveCount(2);
        });
      });
    });

    test.describe('SHORTCUT: Collapse Sidebar', () => {
      test('Collapse sidebar & Expand using default Cmd/Ctrl+\\', async ({ pageWithUserData: page }) => {
        await expect(page.getByTestId('collections')).toBeVisible();
        await page.locator('body').click({ position: { x: 1, y: 1 } });

        // Press Cmd/Ctrl+\ to collapse sidebar
        await pressShortcut(page, modifier, 'Backslash');

        // Verify sidebar collapsed to 0px
        await expect.poll(
          () => page.locator('aside.sidebar').evaluate((el) => getComputedStyle(el).width)
        ).toBe('0px');

        // Press Cmd/Ctrl+\ to expand sidebar
        await pressShortcut(page, modifier, 'Backslash');

        // Verify sidebar expanded to 250px
        await expect.poll(
          () => page.locator('aside.sidebar').evaluate((el) => getComputedStyle(el).width)
        ).toBe('250px');
      });

      test('Collapse sidebar & Expand using customized (Shift+G)', async ({ pageWithUserData: page }) => {
        // Remap collapseSidebar to Shift+G
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-collapseSidebar');
        await row.hover();
        await page.getByTestId('keybinding-edit-collapseSidebar').click();
        await expect(page.getByTestId('keybinding-input-collapseSidebar')).toBeVisible();

        await page.keyboard.press('Backspace');

        await pressShortcut(page, 'Shift', 'KeyG');

        await closePreferencesTab(page);

        // Trigger the remapped shortcut to collapse sidebar
        await pressShortcut(page, 'Shift', 'KeyG');

        // Verify sidebar collapsed to 0px
        await expect.poll(
          () => page.locator('aside.sidebar').evaluate((el) => getComputedStyle(el).width)
        ).toBe('0px');

        // Trigger the remapped shortcut to expand sidebar
        await pressShortcut(page, 'Shift', 'KeyG');

        // Verify sidebar expanded to 250px
        await expect.poll(
          () => page.locator('aside.sidebar').evaluate((el) => getComputedStyle(el).width)
        ).toBe('250px');
      });
    });
  });
});
