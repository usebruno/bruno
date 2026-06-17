import { expect, test } from '../../playwright';
import { closeAllCollections, createFolder, openCollection } from '../utils/page';
import {
  collectionName,
  modifier,
  openFolderSettingsTab,
  openKeybindingsTab,
  openRequest,
  remapKeybinding,
  setupBoundActionsData
} from './helpers';

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
        await page.keyboard.press(`${modifier}+KeyF`);

        console.log('1');
        // await expect(page.getByPlaceholder('Search requests...')).toBeVisible({ timeout: 3000 });
        await expect(page.getByTestId('sidebar-search-input')).toBeVisible({ timeout: 3000 });
        await page.getByTitle('Search requests').click();
        console.log('2');
      });

      test('Sidebar search customized (Alt+F)', async ({ page }) => {
        // Remap sidebarSearch to Alt+F
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-sidebarSearch');
        await row.hover();
        await page.getByTestId('keybinding-edit-sidebarSearch').click();
        await expect(page.getByTestId('keybinding-input-sidebarSearch')).toBeVisible({ timeout: 2000 });

        console.log('1');
        await page.keyboard.down('Backspace');

        console.log('2');
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyF');
        await page.keyboard.up('KeyF');
        await page.keyboard.up('Alt');

        console.log('3');
        // Press Cmd/Ctrl+T to open sidebar search
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyF');
        await page.keyboard.up('KeyF');
        await page.keyboard.up('Alt');

        console.log('4');
        await expect(page.getByTestId('sidebar-search-input')).toBeVisible({ timeout: 2000 });
        await page.getByTitle('Search requests').click();
        console.log('5');
      });
    });

    test.describe('SHORTCUT: New request (Cmd/Ctrl+N)', () => {
      test('New request default (Cmd/Ctrl+N)', async ({ page, createTmpDir }) => {
        await page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder', { exact: true }) }).click();

        console.log('1');
        await page.keyboard.press(`${modifier}+KeyN`);

        console.log('2');
        await page.getByTestId('request-name').fill('nr-folder');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        console.log('3');
        await expect(page.locator('.request-tab').filter({ has: page.getByText('nr-folder', { exact: true }) })).toBeVisible({ timeout: 2000 });
        console.log('4');
      });

      test('New request customized (Alt+N)', async ({ page, createTmpDir }) => {
        // Remap newRequest to Alt+N
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-newRequest');
        await row.hover();
        await page.getByTestId('keybinding-edit-newRequest').click();
        await expect(page.getByTestId('keybinding-input-newRequest')).toBeVisible({ timeout: 2000 });

        console.log('1');
        await page.keyboard.down('Backspace');

        console.log('2');
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyN');
        await page.keyboard.up('KeyN');
        await page.keyboard.up('Alt');

        console.log('3');
        await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText('kb-collection', { exact: true }) }).click();

        console.log('4');
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyN');
        await page.keyboard.up('KeyN');
        await page.keyboard.up('Alt');

        console.log('5');
        await page.getByTestId('request-name').fill('nr-collection');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        console.log('6');
        await expect(page.locator('.request-tab').filter({ has: page.getByText('nr-collection', { exact: true }) })).toBeVisible({ timeout: 2000 });
        console.log('7');
      });
    });

    test.describe('SHORTCUT: Rename Item', () => {
      test.describe('SHORTCUT: Rename Item for request (Cmd/Ctrl+R)', () => {
        test('default Cmd/Ctrl+R open rename item modal for request', async ({ page, createTmpDir }) => {
          await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText('kb-collection', { exact: true }) }).dblclick();
          await openRequest(page, 'kb-collection', 'req-1', { persist: true });
          await page.keyboard.press(`${modifier}+KeyR`);

          console.log('1');
          // Verify rename modal opens
          const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename request/i });
          await expect(renameModal).toBeVisible({ timeout: 3000 });

          console.log('2');
          // Fill in the rename req name
          const requestNameInput = page.locator('#collection-item-name');
          await requestNameInput.fill('req-1-renamed');

          console.log('3');
          // Click the rename button
          await page.getByTestId('rename-item-button').click();

          console.log('4');
          // Verify renamed request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('req-1-renamed', { exact: true }) })).toBeVisible({ timeout: 2000 });
          console.log('5');
        });
      });

      test.describe('SHORTCUT: Rename Item for folder (Cmd/Ctrl+R)', () => {
        test('default Cmd/Ctrl+R open rename item modal for folder', async ({ page, createTmpDir }) => {
          await page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder', { exact: true }) }).dblclick();
          await page.keyboard.press(`${modifier}+KeyR`);

          console.log('1');
          // Verify rename modal opens
          const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename folder/i });
          await expect(renameModal).toBeVisible({ timeout: 3000 });

          console.log('2');
          // Fill in the rename req name
          const folderNameInput = page.locator('#collection-item-name');
          await folderNameInput.fill('kb-folder-renamed');

          console.log('3');
          // Click the rename button
          await page.getByTestId('rename-item-button').click();

          console.log('4');
          // Verify renamed request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder-renamed', { exact: true }) })).toBeVisible({ timeout: 2000 });
          console.log('5');
        });
      });

      test.describe('SHORTCUT: Rename Item for collection (Cmd/Ctrl+R)', () => {
        test('default Cmd/Ctrl+R open rename item modal for collection', async ({ page, createTmpDir }) => {
          await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText('kb-collection', { exact: true }) }).click();
          await page.keyboard.press(`${modifier}+KeyR`);

          console.log('1');
          // Verify rename modal opens
          const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename collection/i });
          await expect(renameModal).toBeVisible({ timeout: 3000 });

          console.log('2');
          // Fill in the rename req name
          const collectionInput = page.locator('#collection-name');
          await collectionInput.fill('kb-collection-renamed');

          console.log('3');
          // Click the rename button
          await page.locator('.submit').click();

          console.log('4');
          // Verify renamed request appears in sidebar
          await expect(page.getByTestId('sidebar-collection-row').filter({ has: page.getByText('kb-collection-renamed', { exact: true }) })).toBeVisible({ timeout: 3000 });
          console.log('5');
        });
      });

      test.describe('SHORTCUT: Rename Item for request (customized Alt+X)', () => {
        test('customized Alt+X open rename item modal for request', async ({ page, createTmpDir }) => {
          // Remap renameItem to Alt+R
          await openKeybindingsTab(page);
          const row = page.getByTestId('keybinding-row-renameItem');
          await row.hover();
          await page.getByTestId('keybinding-edit-renameItem').click();
          await expect(page.getByTestId('keybinding-input-renameItem')).toBeVisible({ timeout: 2000 });

          console.log('1');
          await page.keyboard.down('Backspace');

          console.log('2');
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyX');
          await page.keyboard.up('KeyX');
          await page.keyboard.up('Alt');

          console.log('3');
          await openRequest(page, collectionName, 'req-1', { persist: true });
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyX');
          await page.keyboard.up('KeyX');
          await page.keyboard.up('Alt');

          console.log('4');
          // Verify rename modal opens
          const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename request/i });
          await expect(renameModal).toBeVisible({ timeout: 3000 });

          console.log('5');
          // Fill in the rename req name
          const requestNameInput = page.locator('#collection-item-name');
          await requestNameInput.fill('req-1-renamed-altx');

          console.log('6');
          // Click the rename button
          await page.getByTestId('rename-item-button').click();

          console.log('7');
          // Verify renamed request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('req-1-renamed-altx', { exact: true }) })).toBeVisible({ timeout: 2000 });
          console.log('8');
        });
      });

      test.describe('SHORTCUT: Rename Item for folder (customized Alt+X)', () => {
        test('customized Alt+R open rename item modal for folder', async ({ page, createTmpDir }) => {
          await remapKeybinding(page, 'renameItem', async () => {
            await page.keyboard.press('Alt+KeyX');
          });

          console.log('1');
          await createFolder(page, 'kb-folder-rename-src', collectionName, true);
          await openFolderSettingsTab(page, 'kb-folder-rename-src');
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyX');
          await page.keyboard.up('KeyX');
          await page.keyboard.up('Alt');

          console.log('2');
          // Verify rename modal opens
          const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename folder/i });
          await expect(renameModal).toBeVisible({ timeout: 3000 });

          console.log('3');
          // Fill in the rename req name
          const folderNameInput = page.locator('#collection-item-name');
          await folderNameInput.fill('kb-folder-renamed-altx-src');

          console.log('4');
          // Click the rename button
          await page.getByTestId('rename-item-button').click();

          console.log('5');
          // Verify renamed request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder-renamed-altx-src', { exact: true }) })).toBeVisible({ timeout: 2000 });
          console.log('6');
        });
      });

      test.describe('SHORTCUT: Rename Item for collection (customized Alt+X)', () => {
        test('customized Alt+R open rename item modal for collection', async ({ page, createTmpDir }) => {
          await remapKeybinding(page, 'renameItem', async () => {
            await page.keyboard.press('Alt+KeyX');
          });

          console.log('1');
          await page.getByTestId('sidebar-collection-row').filter({ has: page.getByText(collectionName, { exact: true }) }).click();
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyX');
          await page.keyboard.up('KeyX');
          await page.keyboard.up('Alt');

          console.log('2');
          // Verify rename modal opens
          const renameModal = page.locator('.bruno-modal-card').filter({ hasText: /rename collection/i });
          await expect(renameModal).toBeVisible({ timeout: 3000 });

          console.log('3');
          // Fill in the rename req name
          const collectionInput = page.locator('#collection-name');
          await collectionInput.fill('kb-collection-renamed-altx');

          console.log('4');
          // Click the rename button
          await page.locator('.submit').click();

          console.log('5');
          // Verify renamed request appears in sidebar
          await expect(page.getByTestId('sidebar-collection-row').filter({ has: page.getByText('kb-collection-renamed-altx', { exact: true }) })).toBeVisible({ timeout: 2000 });
          console.log('6');
        });
      });
    });

    test.describe('SHORTCUT: Clone Item', () => {
      test.describe('SHORTCUT: Clone Item for request (Cmd/Ctrl+D)', () => {
        test('default Cmd/Ctrl+D open clone item modal for request', async ({ page, createTmpDir }) => {
          await openRequest(page, 'kb-collection', 'req-1', { persist: true });
          await page.keyboard.press(`${modifier}+KeyD`);

          console.log('1');
          // Verify clone modal opens
          const cloneModal = page.locator('.bruno-modal-card').filter({ hasText: /clone request/i });
          await expect(cloneModal).toBeVisible({ timeout: 3000 });

          console.log('2');
          // Fill in the clone req name
          const requestNameInput = page.locator('#collection-item-name');
          await requestNameInput.fill('req-1 clone 1');

          console.log('3');
          // Click the clone button
          await page.getByTestId('clone-item-button').click();

          console.log('4');
          // Verify cloned request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('req-1 clone 1', { exact: true }) })).toBeVisible({ timeout: 2000 });
          console.log('5');
        });
      });

      test.describe('SHORTCUT: Clone Item for folder (Cmd/Ctrl+D)', () => {
        test('default Cmd/Ctrl+D open clone item modal for folder', async ({ page, createTmpDir }) => {
          await page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder', { exact: true }) }).dblclick();
          await page.keyboard.press(`${modifier}+KeyD`);

          console.log('1');
          // Verify clone modal opens
          const cloneModal = page.locator('.bruno-modal-card').filter({ hasText: /clone folder/i });
          await expect(cloneModal).toBeVisible({ timeout: 3000 });

          console.log('2');
          // Fill in the clone kb-folder name
          const folderNameInput = page.locator('#collection-item-name');
          await folderNameInput.fill('kb-folder clone 1');

          console.log('3');
          // Click the clone button
          await page.getByTestId('clone-item-button').click();

          console.log('4');
          // Verify cloned request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder clone 1', { exact: true }) })).toBeVisible({ timeout: 2000 });
          console.log('5');
        });
      });

      test.describe('SHORTCUT: Clone Item for request (customized Alt+D)', () => {
        test('customized Alt+D open clone item modal for request', async ({ page, createTmpDir }) => {
          // Remap cloneItem to Alt+D
          await openKeybindingsTab(page);
          const row = page.getByTestId('keybinding-row-cloneItem');
          await row.hover();
          await page.getByTestId('keybinding-edit-cloneItem').click();
          await expect(page.getByTestId('keybinding-input-cloneItem')).toBeVisible({ timeout: 2000 });

          console.log('1');
          await page.keyboard.down('Backspace');

          console.log('2');
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyD');
          await page.keyboard.up('KeyD');
          await page.keyboard.up('Alt');

          console.log('3');
          await openRequest(page, 'kb-collection', 'req-2', { persist: true });

          console.log('4');
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyD');
          await page.keyboard.up('KeyD');
          await page.keyboard.up('Alt');

          console.log('5');
          // Verify clone modal opens
          const cloneModal = page.locator('.bruno-modal-card').filter({ hasText: /clone request/i });
          await expect(cloneModal).toBeVisible({ timeout: 3000 });

          console.log('6');
          // Fill in the clone req name
          const requestNameInput = page.locator('#collection-item-name');
          await requestNameInput.fill('req-2 clone 1');

          console.log('7');
          // Click the clone button
          await page.getByTestId('clone-item-button').click();

          console.log('8');
          // Verify renamed request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('req-2 clone 1', { exact: true }) })).toBeVisible({ timeout: 2000 });
          console.log('9');
        });
      });

      test.describe('SHORTCUT: Clone Item for folder (customized Alt+D)', () => {
        test('customized Alt+D open clone item modal for folder', async ({ page, createTmpDir }) => {
          await createFolder(page, 'kb-folder-clone-src', collectionName, true);
          await openCollection(page, collectionName);
          await page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder-clone-src', { exact: true }) }).first().click();
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyD');
          await page.keyboard.up('KeyD');
          await page.keyboard.up('Alt');

          console.log('1');
          // Verify clone modal opens
          const cloneModal = page.locator('.bruno-modal-card').filter({ hasText: /clone folder/i });
          await expect(cloneModal).toBeVisible({ timeout: 3000 });

          console.log('2');
          // Fill in the clone req name
          const folderNameInput = page.locator('#collection-item-name');
          await folderNameInput.fill('kb-folder-clone-src copy 1');

          console.log('3');
          // Click the clone button
          await page.getByTestId('clone-item-button').click();

          console.log('4');
          // Verify renamed request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder-clone-src copy 1', { exact: true }) })).toBeVisible({ timeout: 2000 });
          console.log('5');
        });
      });
    });

    test.describe('SHORTCUT: Copy Paste Item', () => {
      test.describe('SHORTCUT: Copy Paste Item for request (Cmd/Ctrl+C/V)', () => {
        test('default Cmd/Ctrl+C/V copy paste item for request', async ({ page, createTmpDir }) => {
          await openRequest(page, 'kb-collection', 'req-3', { persist: true });
          await page.keyboard.press(`${modifier}+KeyC`);
          await page.keyboard.press(`${modifier}+KeyV`);

          console.log('1');
          // Verify cloned request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('req-3 (1)', { exact: true }) })).toBeVisible({ timeout: 2000 });
          console.log('2');
        });
      });

      test.describe('SHORTCUT: Copy Paste Item for folder (Cmd/Ctrl+C/V)', () => {
        test('default Cmd/Ctrl+C/V copy paste item for folder', async ({ page }) => {
          await openRequest(page, collectionName, 'kb-folder', { persist: true });
          await page.keyboard.press(`${modifier}+KeyC`);
          await page.keyboard.press(`${modifier}+KeyV`);

          console.log('1');
          // Verify copied item appears in sidebar as child of folder
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder', { exact: true }) })).toHaveCount(2);
          console.log('2');
        });
      });

      test.describe('SHORTCUT: Copy Paste Item for request (customized Alt+C/V)', () => {
        test('customized Alt+C/V copy paste item for request', async ({ page, createTmpDir }) => {
          // Remap copyItem to Alt+D
          await openKeybindingsTab(page);
          const row = page.getByTestId('keybinding-row-copyItem');
          await row.hover();
          await page.getByTestId('keybinding-edit-copyItem').click();
          await expect(page.getByTestId('keybinding-input-copyItem')).toBeVisible({ timeout: 2000 });

          console.log('1');
          await page.keyboard.down('Backspace');

          console.log('2');
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyC');
          await page.keyboard.up('KeyC');
          await page.keyboard.up('Alt');

          console.log('3');
          // Remap pasteItem to Alt+V
          await openKeybindingsTab(page);
          const row2 = page.getByTestId('keybinding-row-pasteItem');
          await row2.hover();
          await page.getByTestId('keybinding-edit-pasteItem').click();
          await expect(page.getByTestId('keybinding-input-pasteItem')).toBeVisible({ timeout: 2000 });

          console.log('4');
          await page.keyboard.down('Backspace');

          console.log('5');
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyV');
          await page.keyboard.up('KeyV');
          await page.keyboard.up('Alt');

          console.log('6');
          await openRequest(page, 'kb-collection', 'req-4', { persist: true });
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyC');
          await page.keyboard.up('KeyC');
          await page.keyboard.up('Alt');

          console.log('7');
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyV');
          await page.keyboard.up('KeyV');
          await page.keyboard.up('Alt');

          console.log('8');
          // Verify cloned request appears in sidebar
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('req-4 (1)', { exact: true }) })).toBeVisible({ timeout: 2000 });
          console.log('9');
        });
      });

      test.describe('SHORTCUT: Copy Paste Item for folder (Cmd/Ctrl+C/V)', () => {
        test('customized Alt+C/V copy paste item for folder', async ({ page, createTmpDir }) => {
          await remapKeybinding(page, 'copyItem', async () => {
            await page.keyboard.press('Alt+KeyC');
          });
          await remapKeybinding(page, 'pasteItem', async () => {
            await page.keyboard.press('Alt+KeyV');
          });

          console.log('1');
          await createFolder(page, 'kb-folder-copy-src', collectionName, true);
          await openFolderSettingsTab(page, 'kb-folder-copy-src');
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyC');
          await page.keyboard.up('KeyC');
          await page.keyboard.up('Alt');

          console.log('2');
          await page.keyboard.down('Alt');
          await page.keyboard.down('KeyV');
          await page.keyboard.up('KeyV');
          await page.keyboard.up('Alt');

          console.log('3');
          // Verify copied item appears in sidebar as child of folder
          await expect(page.locator('.collection-item-name').filter({ has: page.getByText('kb-folder-copy-src', { exact: true }) })).toHaveCount(2);
          console.log('4');
        });
      });
    });

    test.describe('SHORTCUT: Collapse Sidebar', () => {
      test('Collapse sidebar & Expand using default Cmd/Ctrl+\\', async ({ page, createTmpDir }) => {
        await expect(page.getByTestId('collections')).toBeVisible();
        await page.locator('body').click({ position: { x: 1, y: 1 } });

        console.log('1');
        // Press Cmd/Ctrl+\ to collapse sidebar
        await page.keyboard.press(`${modifier}+Backslash`);

        console.log('2');
        // Verify sidebar collapsed to 0px
        await expect.poll(
          () => page.locator('aside.sidebar').evaluate((el) => getComputedStyle(el).width),
          { timeout: 5000 }
        ).toBe('0px');

        console.log('3');
        // Press Cmd/Ctrl+\ to expand sidebar
        await page.keyboard.press(`${modifier}+Backslash`);

        console.log('4');
        // Verify sidebar expanded to 250px
        await expect.poll(
          () => page.locator('aside.sidebar').evaluate((el) => getComputedStyle(el).width),
          { timeout: 5000 }
        ).toBe('250px');
        console.log('5');
      });

      test('Collapse sidebar & Expand using customized (Shift+G)', async ({ page, createTmpDir }) => {
        // Remap collapseSidebar to Shift+G
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-collapseSidebar');
        await row.hover();
        await page.getByTestId('keybinding-edit-collapseSidebar').click();
        await expect(page.getByTestId('keybinding-input-collapseSidebar')).toBeVisible({ timeout: 2000 });

        console.log('1');
        await page.keyboard.down('Backspace');

        console.log('2');
        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyG');
        await page.keyboard.up('KeyG');
        await page.keyboard.up('Shift');

        console.log('3');
        // Trigger the remapped shortcut to collapse sidebar
        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyG');
        await page.keyboard.up('KeyG');
        await page.keyboard.up('Shift');

        console.log('4');
        // Verify sidebar collapsed to 0px
        await expect.poll(
          () => page.locator('aside.sidebar').evaluate((el) => getComputedStyle(el).width),
          { timeout: 5000 }
        ).toBe('0px');

        console.log('5');
        // Trigger the remapped shortcut to expand sidebar
        await page.keyboard.down('Shift');
        await page.keyboard.down('KeyG');
        await page.keyboard.up('KeyG');
        await page.keyboard.up('Shift');

        console.log('6');
        // Verify sidebar expanded to 250px
        await expect.poll(
          () => page.locator('aside.sidebar').evaluate((el) => getComputedStyle(el).width),
          { timeout: 5000 }
        ).toBe('250px');
        console.log('7');
      });
    });
  });
});
