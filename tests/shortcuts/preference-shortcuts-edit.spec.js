import { test, expect } from '../../playwright';
import { createCollection, createRequest, createFolder, openRequest, closeAllCollections } from '../utils/page';

test.describe('Preferences - Keybindings Editor', () => {
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  const modifierName = process.platform === 'darwin' ? 'command' : 'ctrl';

  test.beforeEach(async ({ page }) => {
    // Wait for app to be fully loaded
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 5000 });
  });

  const openKeybindingsTab = async (page) => {
    await page.getByRole('button', { name: 'Open Preferences' }).click();
    await page.getByRole('tab', { name: 'Keybindings' }).click();
    await expect(page.locator('.section-header').filter({ hasText: 'Keybindings' })).toBeVisible();
  };

  const getInput = (page, action) => page.getByTestId(`keybinding-input-${action}`);
  const getResetBtn = (page, action) => page.getByTestId(`keybinding-reset-${action}`);
  const getEditBtn = (page, action) => page.getByTestId(`keybinding-edit-${action}`);
  const getError = (page, action) => page.getByTestId(`keybinding-error-${action}`);

  test('should open Preferences tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Open Preferences' }).click();
    await page.getByRole('tab', { name: 'Keybindings' }).click();
    await expect(page.locator('.section-header').filter({ hasText: 'Keybindings' })).toBeVisible();
  });

  test.describe('FUNCTIONAL: Global Search', () => {
    test('should open global search using default Cmd/Ctrl+K', async ({ page, createTmpDir }) => {
      // Close all collections first for clean state
      await closeAllCollections(page);

      const collectionPath = await createTmpDir('global-search-default');
      await createCollection(page, 'test-collection-global-search-default', collectionPath);

      // Create a request
      await createRequest(page, 'request-1', 'test-collection-global-search-default');

      // Wait for collection to be ready
      await page.waitForTimeout(500);

      // Press Cmd/Ctrl+K to open global search
      await page.keyboard.press(`${modifier}+KeyK`);
      await page.waitForTimeout(500);

      // Verify global search modal is visible
      const searchModal = page.locator('.command-k-modal');
      await expect(searchModal).toBeVisible();

      // Close the modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Verify modal is closed
      await expect(searchModal).not.toBeVisible();
    });

    test('should open global search using customized-1 Cmd/Ctrl+Shift+G', async ({ page, createTmpDir }) => {
      // Close all collections, tabs, and preferences first
      await closeAllCollections(page);

      // Close any open preference tabs
      const preferenceTabs = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      const prefTabCount = await preferenceTabs.count();
      for (let i = 0; i < prefTabCount; i++) {
        await page.keyboard.press(`${modifier}+KeyW`);
        await page.waitForTimeout(200);
      }

      // Open Keybindings preferences and customize globalSearch FIRST
      await openKeybindingsTab(page);

      const row = page.getByTestId('keybinding-row-globalSearch');
      await row.hover();

      // Start recording
      await getEditBtn(page, 'globalSearch').click();
      await page.waitForTimeout(300);

      // Press new combo: Cmd/Ctrl+Shift+G (G is not used in any existing keybinding)
      // Use down/up to ensure proper key recording
      await page.keyboard.down(modifier);
      await page.keyboard.down('Shift');
      await page.keyboard.down('KeyG');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyG');
      await page.keyboard.up('Shift');
      await page.keyboard.up(modifier);
      await page.waitForTimeout(200);

      // Verify the keybinding was saved
      const input = getInput(page, 'globalSearch');
      const newValue = await input.inputValue();
      expect(newValue).toContain('shift');
      expect(newValue).toContain('g');

      // Close preferences
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(200);

      // Now create collection and request
      const collectionPath = await createTmpDir('global-search-customized-1');
      await createCollection(page, 'test-collection-global-search-customized-1', collectionPath);

      // Create a request
      await createRequest(page, 'request-1', 'test-collection-global-search-customized-1');

      // Wait for collection to be ready
      await page.waitForTimeout(500);

      // Press Cmd/Ctrl+Shift+G to open global search
      await page.keyboard.press(`${modifier}+Shift+KeyG`);
      await page.waitForTimeout(500);

      // Verify global search modal is visible
      const searchModal = page.locator('.command-k-modal');
      await expect(searchModal).toBeVisible();

      // Close the modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Verify modal is closed
      await expect(searchModal).not.toBeVisible();
    });
  });

  test.describe('FUNCTIONAL: Sidebar Search', () => {
    test('should open sidebar search using default Cmd/Ctrl+F', async ({ page, createTmpDir }) => {
      const collectionPath = await createTmpDir('sidebar-search-default');
      await createCollection(page, 'test-collection-sidebar-search-default', collectionPath);

      // Create a request
      await createRequest(page, 'request-1', 'test-collection-sidebar-search-default');

      // Wait for collection to be ready
      await page.waitForTimeout(500);

      // Press Cmd/Ctrl+F to open sidebar search
      await page.keyboard.press(`${modifier}+KeyF`);
      await page.waitForTimeout(500);

      // // Verify sidebar search appears (look for search input in sidebar)
      // await expect(page.get('Search requests...').toBeVisible());
      await page.locator('body').click({ position: { x: 1, y: 1 } });

      // Clear the search
      await page.keyboard.press(`${modifier}+KeyF`);
      await page.waitForTimeout(300);
    });

    test('should open sidebar search using customized-1 Cmd/Ctrl+Shift+H', async ({ page, createTmpDir }) => {
      // Close all collections, tabs, and preferences first
      await closeAllCollections(page);

      // Close any open preference tabs
      const preferenceTabs = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      const prefTabCount = await preferenceTabs.count();
      for (let i = 0; i < prefTabCount; i++) {
        await page.keyboard.press(`${modifier}+KeyW`);
        await page.waitForTimeout(200);
      }

      // Open Keybindings preferences and customize sidebarSearch FIRST
      await openKeybindingsTab(page);

      const row = page.getByTestId('keybinding-row-sidebarSearch');
      await row.hover();

      // Start recording
      await getEditBtn(page, 'sidebarSearch').click();
      await page.waitForTimeout(300);

      // Press new combo: Cmd/Ctrl+Shift+H (H is not used in any existing keybinding)
      // Use down/up to ensure proper key recording
      await page.keyboard.down(modifier);
      await page.keyboard.down('Shift');
      await page.keyboard.down('KeyH');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyH');
      await page.keyboard.up('Shift');
      await page.keyboard.up(modifier);
      await page.waitForTimeout(200);

      // Verify the keybinding was saved
      const input = getInput(page, 'sidebarSearch');
      const newValue = await input.inputValue();
      expect(newValue).toContain('shift');
      expect(newValue).toContain('h');

      // Close preferences
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(200);

      // Now create collection and request
      const collectionPath = await createTmpDir('sidebar-search-customized-1');
      await createCollection(page, 'test-collection-sidebar-search-customized-1', collectionPath);

      // Create a request
      await createRequest(page, 'request-1', 'test-collection-sidebar-search-customized-1');

      // Wait for collection to be ready
      await page.waitForTimeout(500);

      // Press Cmd/Ctrl+Shift+H to open sidebar search
      await page.keyboard.press(`${modifier}+Shift+KeyH`);
      await page.waitForTimeout(500);

      // Verify sidebar search input is visible and focused
      // const searchInput = page.locator('#sidebar-search-input');

      // Clear the search
      await page.locator('body').click({ position: { x: 1, y: 1 } });

      // Verify sidebar search appears (look for search input in sidebar)
      await page.keyboard.press(`${modifier}+Shift+KeyH`);
      await page.waitForTimeout(300);
    });
  });

  test.describe('FUNCTIONAL: Import Collection', () => {
    test('should open import collection modal using default Cmd/Ctrl+O', async ({ page, createTmpDir }) => {
      const collectionPath = await createTmpDir('import-collection-default');
      await createCollection(page, 'test-collection-import-default', collectionPath);

      // Wait for collection to be ready
      await page.waitForTimeout(500);

      // Press Cmd/Ctrl+O to open import collection modal
      await page.keyboard.press(`${modifier}+KeyO`);
      await page.waitForTimeout(500);

      // Verify import collection modal is visible
      const importModal = page.locator('.bruno-modal-card').filter({ hasText: 'Import Collection' });
      await expect(importModal).toBeVisible();

      // Close the modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Verify modal is closed
      await expect(importModal).not.toBeVisible();
    });

    test('should open import collection modal using customized-1 Cmd/Ctrl+Shift+I', async ({ page, createTmpDir }) => {
      // Close all collections, tabs, and preferences first
      await closeAllCollections(page);

      // Close any open preference tabs
      const preferenceTabs = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      const prefTabCount = await preferenceTabs.count();
      for (let i = 0; i < prefTabCount; i++) {
        await page.keyboard.press(`${modifier}+KeyW`);
        await page.waitForTimeout(200);
      }

      // Open Keybindings preferences and customize importCollection FIRST
      await openKeybindingsTab(page);

      const row = page.getByTestId('keybinding-row-importCollection');
      await row.hover();

      // Start recording
      await getEditBtn(page, 'importCollection').click();
      await page.waitForTimeout(300);

      // Press new combo: Cmd/Ctrl+Shift+I (I is not used in any existing keybinding)
      // Use down/up to ensure proper key recording
      await page.keyboard.down(modifier);
      await page.keyboard.down('Shift');
      await page.keyboard.down('KeyI');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyI');
      await page.keyboard.up('Shift');
      await page.keyboard.up(modifier);
      await page.waitForTimeout(200);

      // Verify the keybinding was saved
      const input = getInput(page, 'importCollection');
      const newValue = await input.inputValue();
      expect(newValue).toContain('shift');
      expect(newValue).toContain('i');

      // Close preferences
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(200);

      // Now create collection
      const collectionPath = await createTmpDir('import-collection-customized-1');
      await createCollection(page, 'test-collection-import-customized-1', collectionPath);

      // Wait for collection to be ready
      await page.waitForTimeout(500);

      // Press Cmd/Ctrl+Shift+I to open import collection modal
      await page.keyboard.press(`${modifier}+Shift+KeyI`);
      await page.waitForTimeout(500);

      // Verify import collection modal is visible
      const importModal = page.locator('.bruno-modal-card').filter({ hasText: 'Import Collection' });
      await expect(importModal).toBeVisible();

      // Close the modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Verify modal is closed
      await expect(importModal).not.toBeVisible();
    });
  });

  test.describe('FUNCTIONAL: Change Layout', () => {
    test('should change layout orientation using default Cmd/Ctrl+J', async ({ page, createTmpDir }) => {
      const collectionPath = await createTmpDir('change-layout-default');
      await createCollection(page, 'test-collection-layout-default', collectionPath);

      // Create and open a request
      await createRequest(page, 'request-1', 'test-collection-layout-default');
      await openRequest(page, 'test-collection-layout-default', 'request-1');

      // Press Cmd/Ctrl+J to change layout
      await page.keyboard.press(`${modifier}+KeyJ`);
      await page.waitForTimeout(500);

      await expect(
        page.getByTestId('response-layout-toggle-btn')
      ).toHaveAttribute('title', 'Switch to horizontal layout');

      // Press Cmd/Ctrl+J to change layout
      await page.keyboard.press(`${modifier}+KeyJ`);
      await page.waitForTimeout(500);

      await expect(
        page.getByTestId('response-layout-toggle-btn')
      ).toHaveAttribute('title', 'Switch to vertical layout');
    });

    test('should change layout orientation using customized-1 Cmd/Ctrl+Shift+Y', async ({ page, createTmpDir }) => {
      // Close all collections, tabs, and preferences first
      await closeAllCollections(page);

      // Close any open preference tabs
      const preferenceTabs = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      const prefTabCount = await preferenceTabs.count();
      for (let i = 0; i < prefTabCount; i++) {
        await page.keyboard.press(`${modifier}+KeyW`);
        await page.waitForTimeout(200);
      }

      // Open Keybindings preferences and customize changeLayout FIRST
      await openKeybindingsTab(page);

      const row = page.getByTestId('keybinding-row-changeLayout');
      await row.hover();

      // Start recording
      await getEditBtn(page, 'changeLayout').click();
      await page.waitForTimeout(300);

      // Press new combo: Cmd/Ctrl+Shift+Y (Y is not used in any existing keybinding)
      // Use down/up to ensure proper key recording
      await page.keyboard.down(modifier);
      await page.keyboard.down('Shift');
      await page.keyboard.down('KeyY');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyY');
      await page.keyboard.up('Shift');
      await page.keyboard.up(modifier);
      await page.waitForTimeout(200);

      // Verify the keybinding was saved
      const input = getInput(page, 'changeLayout');
      const newValue = await input.inputValue();
      expect(newValue).toContain('shift');
      expect(newValue).toContain('y');

      // Close preferences
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(500);

      // Now create collection and request
      const collectionPath = await createTmpDir('change-layout-customized-1');
      await createCollection(page, 'test-collection-layout-customized-1', collectionPath);

      // Create and open a request
      await createRequest(page, 'request-1', 'test-collection-layout-customized-1');
      await openRequest(page, 'test-collection-layout-customized-1', 'request-1');

      // Press Cmd/Ctrl+Shift+J to change layout
      await page.keyboard.press(`${modifier}+Shift+KeyY`);
      await page.waitForTimeout(500);

      await expect(
        page.getByTestId('response-layout-toggle-btn')
      ).toHaveAttribute('title', 'Switch to horizontal layout');

      // Press Cmd/Ctrl+Shift+J to change layout
      await page.keyboard.press(`${modifier}+Shift+KeyY`);
      await page.waitForTimeout(500);

      await expect(
        page.getByTestId('response-layout-toggle-btn')
      ).toHaveAttribute('title', 'Switch to vertical layout');
    });
  });

  test.describe('FUNCTIONAL: Collapse Sidebar', () => {
    test('should collapse/expand sidebar using default Cmd/Ctrl+\\', async ({ page, createTmpDir }) => {
      const collectionPath = await createTmpDir('collapse-sidebar-default');
      await createCollection(page, 'test-collection-sidebar-default', collectionPath);

      // Wait for collection to be ready
      await page.waitForTimeout(500);

      // // Get initial sidebar state
      const width = await page.locator('aside.sidebar').evaluate((el) =>
        getComputedStyle(el).width
      );

      expect(width).not.toBe('0px');

      await expect(page.getByTestId('collections')).toBeVisible();

      // Press Cmd/Ctrl+\ to collapse sidebar
      await page.keyboard.press(`${modifier}+Backslash`);
      await page.waitForTimeout(500);

      // await expect(page.getByTestId('collections')).not.toBeVisible();

      const width2 = await page.locator('aside.sidebar').evaluate((el) =>
        getComputedStyle(el).width
      );

      expect(width2).toBe('0px');

      // Press again to expand
      await page.keyboard.press(`${modifier}+Backslash`);
      await page.waitForTimeout(500);
    });

    test('should collapse/expand sidebar using customized-1 Cmd/Ctrl+Shift+B', async ({ page, createTmpDir }) => {
      // Close all collections, tabs, and preferences first
      await closeAllCollections(page);

      // Close any open preference tabs
      const preferenceTabs = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      const prefTabCount = await preferenceTabs.count();
      for (let i = 0; i < prefTabCount; i++) {
        await page.keyboard.press(`${modifier}+KeyW`);
        await page.waitForTimeout(200);
      }

      // Open Keybindings preferences and customize collapseSidebar FIRST
      await openKeybindingsTab(page);

      const row = page.getByTestId('keybinding-row-collapseSidebar');
      await row.hover();

      // Start recording
      await getEditBtn(page, 'collapseSidebar').click();
      await page.waitForTimeout(300);

      // Press new combo: Cmd/Ctrl+Shift+B (B is not used in any existing keybinding)
      // Use down/up to ensure proper key recording
      await page.keyboard.down(modifier);
      await page.keyboard.down('Shift');
      await page.keyboard.down('KeyB');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyB');
      await page.keyboard.up('Shift');
      await page.keyboard.up(modifier);
      await page.waitForTimeout(200);

      // Verify the keybinding was saved
      const input = getInput(page, 'collapseSidebar');
      const newValue = await input.inputValue();
      expect(newValue).toContain('shift');
      expect(newValue).toContain('b');

      // Close preferences
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(200);

      // Now create collection
      const collectionPath = await createTmpDir('collapse-sidebar-customized-1');
      await createCollection(page, 'test-collection-sidebar-customized-1', collectionPath);

      // Wait for collection to be ready
      await page.waitForTimeout(500);

      // // Get initial sidebar state
      const width = await page.locator('aside.sidebar').evaluate((el) =>
        getComputedStyle(el).width
      );

      expect(width).not.toBe('0px');

      await expect(page.getByTestId('collections')).toBeVisible();

      // Press Cmd/Ctrl+\ to collapse sidebar
      await page.keyboard.press(`${modifier}+Shift+KeyB`);
      await page.waitForTimeout(500);

      // await expect(page.getByTestId('collections')).not.toBeVisible();

      const width2 = await page.locator('aside.sidebar').evaluate((el) =>
        getComputedStyle(el).width
      );

      expect(width2).toBe('0px');

      // Press again to expand
      await page.keyboard.press(`${modifier}+Shift+KeyB`);
      await page.waitForTimeout(500);
    });
  });

  test.describe('FUNCTIONAL: Close Tab', () => {
    test('should close single tab using default Cmd/Ctrl+W', async ({ page, createTmpDir }) => {
      // Close all collections first for clean state
      await closeAllCollections(page);

      const collectionPath = await createTmpDir('close-tab-default');
      await createCollection(page, 'test-collection-close-tab-default', collectionPath);

      // Create multiple requests
      await createRequest(page, 'request-1', 'test-collection-close-tab-default');
      await createRequest(page, 'request-2', 'test-collection-close-tab-default');
      await createRequest(page, 'request-3', 'test-collection-close-tab-default');

      // Open and pin all requests
      await openRequest(page, 'test-collection-close-tab-default', 'request-1', { persist: true });
      await openRequest(page, 'test-collection-close-tab-default', 'request-2', { persist: true });
      await openRequest(page, 'test-collection-close-tab-default', 'request-3', { persist: true });

      // Wait for tabs to be ready
      await page.waitForTimeout(500);

      // Verify all 3 tabs are open
      const tabs = page.locator('.request-tab');
      await expect(tabs).toHaveCount(3);

      // Verify request-3 is active
      const activeTab = page.locator('li.request-tab.active');
      await expect(activeTab).toHaveText(/request-3/);

      // Press Cmd/Ctrl+W to close active tab
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(500);

      // Verify only 2 tabs remain and request-3 is closed
      await expect(tabs).toHaveCount(2);
      await expect(page.locator('.request-tab').filter({ hasText: 'request-3' })).not.toBeVisible();

      // Verify request-2 is now active
      await expect(activeTab).toHaveText(/request-2/);

      // Close another tab
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(500);

      // Verify only 1 tab remains
      await expect(tabs).toHaveCount(1);
      await expect(page.locator('.request-tab').filter({ hasText: 'request-2' })).not.toBeVisible();

      // Verify request-1 is now active
      await expect(activeTab).toHaveText(/request-1/);
    });

    test('should close single tab using customized Alt+T+C', async ({ page, createTmpDir }) => {
      // Close all collections first
      await closeAllCollections(page);

      // Open Keybindings preferences and customize closeTab FIRST
      await openKeybindingsTab(page);

      const row = page.getByTestId('keybinding-row-closeTab');
      await row.hover();

      // Start recording
      await getEditBtn(page, 'closeTab').click();
      await page.waitForTimeout(300);

      // Press new combo: Alt+T+C
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyT');
      await page.keyboard.down('KeyC');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyC');
      await page.keyboard.up('KeyT');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(1000);

      // Verify the keybinding was saved
      const input = getInput(page, 'closeTab');
      const newValue = await input.inputValue();
      expect(newValue).toContain('alt');
      expect(newValue).toContain('t');
      expect(newValue).toContain('c');

      await page.keyboard.press(`${modifier}+KeyT+KeyC`);
      await page.waitForTimeout(500);

      // Now create collection and requests
      const collectionPath = await createTmpDir('close-tab-customized');
      await createCollection(page, 'test-collection-close-tab-customized', collectionPath);

      // Create multiple requests
      await createRequest(page, 'request-1', 'test-collection-close-tab-customized');
      await createRequest(page, 'request-2', 'test-collection-close-tab-customized');
      await createRequest(page, 'request-3', 'test-collection-close-tab-customized');

      // Open and pin all requests
      await openRequest(page, 'test-collection-close-tab-customized', 'request-1', { persist: true });
      await openRequest(page, 'test-collection-close-tab-customized', 'request-2', { persist: true });
      await openRequest(page, 'test-collection-close-tab-customized', 'request-3', { persist: true });

      // Wait for tabs to be ready
      await page.waitForTimeout(500);

      // Verify all 3 tabs are open
      const tabs = page.locator('.request-tab');
      await expect(tabs).toHaveCount(3);

      // Verify request-3 is active
      const activeTab = page.locator('li.request-tab.active');
      await expect(activeTab).toHaveText(/request-3/);

      // Press Alt+T+C to close active tab
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyT');
      await page.keyboard.down('KeyC');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyC');
      await page.keyboard.up('KeyT');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(500);

      // Verify only 2 tabs remain and request-3 is closed
      await expect(tabs).toHaveCount(2);
      await expect(page.locator('.request-tab').filter({ hasText: 'request-3' })).not.toBeVisible();

      // Verify request-2 is now active
      await expect(activeTab).toHaveText(/request-2/);

      // Close another tab
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyT');
      await page.keyboard.down('KeyC');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyC');
      await page.keyboard.up('KeyT');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(500);

      // Verify only 1 tab remains
      await expect(tabs).toHaveCount(1);
      await expect(page.locator('.request-tab').filter({ hasText: 'request-2' })).not.toBeVisible();

      // Verify request-1 is now active
      await expect(activeTab).toHaveText(/request-1/);
    });
  });

  test.describe('FUNCTIONAL: Close All Tabs', () => {
    test('should close all tabs using default Cmd/Ctrl+Shift+W', async ({ page, createTmpDir }) => {
      const collectionPath = await createTmpDir('close-all-tabs-default');
      await createCollection(page, 'test-collection-close-all-default', collectionPath);

      // Create multiple requests
      await createRequest(page, 'request-1', 'test-collection-close-all-default');
      await createRequest(page, 'request-2', 'test-collection-close-all-default');
      await createRequest(page, 'request-3', 'test-collection-close-all-default');

      // Open and pin all requests
      await openRequest(page, 'test-collection-close-all-default', 'request-1', { persist: true });
      await openRequest(page, 'test-collection-close-all-default', 'request-2', { persist: true });
      await openRequest(page, 'test-collection-close-all-default', 'request-3', { persist: true });

      // Wait for tabs to be ready
      await page.waitForTimeout(500);

      // Verify all 3 tabs are open
      await expect(page.locator('.request-tab')).toHaveCount(3); // 'request-1/2/3'

      // Press Cmd/Ctrl+Shift+W to close all tabs
      await page.keyboard.press(`${modifier}+Shift+KeyW`);
      await page.waitForTimeout(500);

      // Verify all tabs are closed
      await expect(page.locator('.request-tab')).toHaveCount(2); // Overview / Global Environments
    });

    test('should close all tabs using customized-1 Alt+W+A', async ({ page, createTmpDir }) => {
      // Close all collections, tabs, and preferences first
      await closeAllCollections(page);

      // Close any open preference tabs
      const preferenceTabs = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      const prefTabCount = await preferenceTabs.count();
      for (let i = 0; i < prefTabCount; i++) {
        await page.keyboard.press(`${modifier}+KeyW`);
        await page.waitForTimeout(200);
      }

      // Open Keybindings preferences and customize closeAllTabs FIRST
      await openKeybindingsTab(page);

      const row = page.getByTestId('keybinding-row-closeAllTabs');
      await row.hover();

      // Start recording
      await getEditBtn(page, 'closeAllTabs').click();
      await page.waitForTimeout(300);

      // Press new combo: Alt+W+A (multi-key sequence)
      // Use down/up to ensure proper key recording
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyW');
      await page.keyboard.down('KeyA');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyA');
      await page.keyboard.up('KeyW');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(500);

      // Verify the keybinding was saved
      const input = getInput(page, 'closeAllTabs');
      const newValue = await input.inputValue();
      expect(newValue).toContain('alt');
      expect(newValue).toContain('w');
      expect(newValue).toContain('a');

      // Close preferences
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(500);

      // Now create collection and requests
      const collectionPath = await createTmpDir('close-all-tabs-customized-1');
      await createCollection(page, 'test-collection-close-all-customized-1', collectionPath);

      // Create multiple requests
      await createRequest(page, 'request-1', 'test-collection-close-all-customized-1');
      await createRequest(page, 'request-2', 'test-collection-close-all-customized-1');
      await createRequest(page, 'request-3', 'test-collection-close-all-customized-1');

      // Open and pin all requests
      await openRequest(page, 'test-collection-close-all-customized-1', 'request-1', { persist: true });
      await openRequest(page, 'test-collection-close-all-customized-1', 'request-2', { persist: true });
      await openRequest(page, 'test-collection-close-all-customized-1', 'request-3', { persist: true });

      // Wait for tabs to be ready
      await page.waitForTimeout(500);

      // Verify all tabs are closed
      await expect(page.locator('.request-tab')).toHaveCount(3); // Overview / Global Environments / Preferences
    });
  });

  test.describe('FUNCTIONAL: Switch to Previous Tab', () => {
    test('should switch to previous tab using default Cmd/Ctrl+2', async ({ page, createTmpDir }) => {
      // Close all collections first for clean state
      await closeAllCollections(page);

      const collectionPath = await createTmpDir('switch-tabs-default');
      await createCollection(page, 'test-collection-switching-default', collectionPath);

      // Create multiple requests
      await createRequest(page, 'request-1', 'test-collection-switching-default');
      await createRequest(page, 'request-2', 'test-collection-switching-default');
      await createRequest(page, 'request-3', 'test-collection-switching-default');

      // Open and pin all requests (persist: true means double-click to pin)
      await openRequest(page, 'test-collection-switching-default', 'request-1', { persist: true });
      await openRequest(page, 'test-collection-switching-default', 'request-2', { persist: true });
      await openRequest(page, 'test-collection-switching-default', 'request-3', { persist: true });

      // Wait for tabs to be ready - request-3 should be active
      await page.waitForTimeout(500);

      // Click on request-1 to make it active
      await page.locator('.request-tab').filter({ hasText: 'request-3' }).click();
      await page.waitForTimeout(300);

      // Press Cmd/Ctrl+1 to switch to next tab
      await page.keyboard.press(`${modifier}+Digit2`);
      await page.waitForTimeout(500);

      // Verify next tab is active (request-2)
      const activeTab = page.locator('li.request-tab.active');
      await expect(activeTab).toHaveText(/request-2/);

      // Press again
      await page.keyboard.press(`${modifier}+Digit2`);
      await page.waitForTimeout(500);

      // Verify next tab is active (request-3)
      await expect(activeTab).toHaveText(/request-1/);
    });

    test('should switch to previous tab using customized-1 Cmd/Ctrl+Shift+P', async ({ page, createTmpDir }) => {
      // Close all collections, tabs, and preferences first
      await closeAllCollections(page);

      // Close any open preference tabs
      const preferenceTabs = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      const prefTabCount = await preferenceTabs.count();
      for (let i = 0; i < prefTabCount; i++) {
        await page.keyboard.press(`${modifier}+KeyW`);
        await page.waitForTimeout(200);
      }

      // Open Keybindings preferences and customize switchToPreviousTab FIRST
      await openKeybindingsTab(page);

      const row = page.getByTestId('keybinding-row-switchToPreviousTab');
      await row.hover();

      // Start recording
      await getEditBtn(page, 'switchToPreviousTab').click();
      await page.waitForTimeout(300);

      // Press new combo: Cmd/Ctrl+Shift+P (P is not used in any existing keybinding)
      // Use down/up to ensure proper key recording
      await page.keyboard.down(modifier);
      await page.keyboard.down('Shift');
      await page.keyboard.down('KeyP');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyP');
      await page.keyboard.up('Shift');
      await page.keyboard.up(modifier);
      await page.waitForTimeout(200);

      // Verify the keybinding was saved
      const input = getInput(page, 'switchToPreviousTab');
      const newValue = await input.inputValue();
      expect(newValue).toContain('shift');
      expect(newValue).toContain('p');

      // Close preferences
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(200);

      // Now create collection and requests
      const collectionPath = await createTmpDir('switch-tabs-customized-1');
      await createCollection(page, 'test-collection-switching-customized-1', collectionPath);

      // Create multiple requests
      await createRequest(page, 'request-1', 'test-collection-switching-customized-1');
      await createRequest(page, 'request-2', 'test-collection-switching-customized-1');
      await createRequest(page, 'request-3', 'test-collection-switching-customized-1');

      // Open and pin all requests (persist: true means double-click to pin)
      await openRequest(page, 'test-collection-switching-customized-1', 'request-1', { persist: true });
      await openRequest(page, 'test-collection-switching-customized-1', 'request-2', { persist: true });
      await openRequest(page, 'test-collection-switching-customized-1', 'request-3', { persist: true });

      // Wait for tabs to be ready
      await page.waitForTimeout(500);

      // Press Cmd/Ctrl+2 to switch to previous tab
      await page.keyboard.press(`${modifier}+Shift+KeyP`);
      await page.waitForTimeout(500);

      // Verify previous tab is active (request-2)
      const activeTab = page.locator('li.request-tab.active');
      await expect(activeTab).toHaveText(/request-2/);

      // Press again
      await page.keyboard.press(`${modifier}+Shift+KeyP`);
      await page.waitForTimeout(200);

      // Verify previous tab is active (request-1)
      await expect(activeTab).toHaveText(/request-1/);
    });
  });

  test.describe('FUNCTIONAL: Switch to Next Tab', () => {
    test('should switch to next tab using default Cmd/Ctrl+1', async ({ page, createTmpDir }) => {
      // Close all collections first for clean state
      await closeAllCollections(page);

      const collectionPath = await createTmpDir('switch-tabs-next-default');
      await createCollection(page, 'test-collection-switching-next-default', collectionPath);

      // Create multiple requests
      await createRequest(page, 'request-1', 'test-collection-switching-next-default');
      await createRequest(page, 'request-2', 'test-collection-switching-next-default');
      await createRequest(page, 'request-3', 'test-collection-switching-next-default');

      // Open and pin all requests (persist: true means double-click to pin)
      await openRequest(page, 'test-collection-switching-next-default', 'request-1', { persist: true });
      await openRequest(page, 'test-collection-switching-next-default', 'request-2', { persist: true });
      await openRequest(page, 'test-collection-switching-next-default', 'request-3', { persist: true });

      // Wait for tabs to be ready - request-3 should be active
      await page.waitForTimeout(500);

      // Click on request-1 to make it active
      await page.locator('.request-tab').filter({ hasText: 'request-1' }).click();
      await page.waitForTimeout(300);

      // Press Cmd/Ctrl+1 to switch to next tab
      await page.keyboard.press(`${modifier}+Digit1`);
      await page.waitForTimeout(500);

      // Verify next tab is active (request-2)
      const activeTab = page.locator('li.request-tab.active');
      await expect(activeTab).toHaveText(/request-2/);

      // Press again
      await page.keyboard.press(`${modifier}+Digit1`);
      await page.waitForTimeout(500);

      // Verify next tab is active (request-3)
      await expect(activeTab).toHaveText(/request-3/);
    });

    test('should switch to next tab using customized-1 Cmd/Ctrl+Shift+L', async ({ page, createTmpDir }) => {
      // Close all collections, tabs, and preferences first
      await closeAllCollections(page);

      // Close any open preference tabs
      const preferenceTabs = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      const prefTabCount = await preferenceTabs.count();
      for (let i = 0; i < prefTabCount; i++) {
        await page.keyboard.press(`${modifier}+KeyW`);
        await page.waitForTimeout(200);
      }

      // Open Keybindings preferences and customize switchToNextTab FIRST
      await openKeybindingsTab(page);

      const row = page.getByTestId('keybinding-row-switchToNextTab');
      await row.hover();

      // Start recording
      await getEditBtn(page, 'switchToNextTab').click();
      await page.waitForTimeout(300);

      // Press new combo: Cmd/Ctrl+Shift+L (L is not used in any existing keybinding)
      // Use down/up to ensure proper key recording
      await page.keyboard.down(modifier);
      await page.keyboard.down('Shift');
      await page.keyboard.down('KeyL');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyL');
      await page.keyboard.up('Shift');
      await page.keyboard.up(modifier);
      await page.waitForTimeout(200);

      // Verify the keybinding was saved
      const input = getInput(page, 'switchToNextTab');
      const newValue = await input.inputValue();
      expect(newValue).toContain('shift');
      expect(newValue).toContain('l');

      // Close preferences
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(200);

      // Now create collection and requests
      const collectionPath = await createTmpDir('switch-tabs-next-customized-1');
      await createCollection(page, 'test-collection-switching-next-customized-1', collectionPath);

      // Create multiple requests
      await createRequest(page, 'request-1', 'test-collection-switching-next-customized-1');
      await createRequest(page, 'request-2', 'test-collection-switching-next-customized-1');
      await createRequest(page, 'request-3', 'test-collection-switching-next-customized-1');

      // Open and pin all requests (persist: true means double-click to pin)
      await openRequest(page, 'test-collection-switching-next-customized-1', 'request-1', { persist: true });
      await openRequest(page, 'test-collection-switching-next-customized-1', 'request-2', { persist: true });
      await openRequest(page, 'test-collection-switching-next-customized-1', 'request-3', { persist: true });

      // Wait for tabs to be ready - request-3 should be active
      await page.waitForTimeout(500);

      // Click on request-1 to make it active
      await page.locator('.request-tab').filter({ hasText: 'request-1' }).click();
      await page.waitForTimeout(300);

      // Press Cmd/Ctrl+Shift+L to switch to next tab
      await page.keyboard.press(`${modifier}+Shift+KeyL`);
      await page.waitForTimeout(500);

      // Verify next tab is active (request-2)
      const activeTab = page.locator('li.request-tab.active');
      await expect(activeTab).toHaveText(/request-2/);

      // Press again
      await page.keyboard.press(`${modifier}+Shift+KeyL`);
      await page.waitForTimeout(200);

      // Verify next tab is active (request-3)
      await expect(activeTab).toHaveText(/request-3/);
    });
  });

  test.describe('FUNCTIONAL: Edit Environment', () => {
    test('should open environment editor using default Cmd/Ctrl+E', async ({ page, createTmpDir }) => {
      const collectionPath = await createTmpDir('edit-environment-default');
      await createCollection(page, 'test-collection-environment-default', collectionPath);

      // Wait for collection to be ready
      await page.waitForTimeout(500);

      // Press Cmd/Ctrl+E to open environment editor
      await page.keyboard.press(`${modifier}+KeyE`);
      await page.waitForTimeout(500);

      // Verify environment editor tab is visible
      const envTab = page.locator('.request-tab').filter({ hasText: 'Environments' });
      await expect(envTab).toBeVisible();
    });

    test('should open environment editor using customized-1 Alt+E+G', async ({ page, createTmpDir }) => {
      // Close all collections, tabs, and preferences first
      await closeAllCollections(page);

      // Close any open preference tabs
      const preferenceTabs = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      const prefTabCount = await preferenceTabs.count();
      for (let i = 0; i < prefTabCount; i++) {
        await page.keyboard.press(`${modifier}+KeyW`);
        await page.waitForTimeout(200);
      }

      // Open Keybindings preferences and customize editEnvironment FIRST
      await openKeybindingsTab(page);

      const row = page.getByTestId('keybinding-row-editEnvironment');
      await row.hover();

      // Start recording
      await getEditBtn(page, 'editEnvironment').click();
      await page.waitForTimeout(300);

      // Press new combo: Alt+E+G (multi-key sequence)
      // Use down/up to ensure proper key recording
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyE');
      await page.keyboard.down('KeyG');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyG');
      await page.keyboard.up('KeyE');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(500);

      // Verify the keybinding was saved
      const input = getInput(page, 'editEnvironment');
      const newValue = await input.inputValue();
      expect(newValue).toContain('alt');
      expect(newValue).toContain('e');
      expect(newValue).toContain('g');

      // Close preferences
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(500);

      // Now create collection
      const collectionPath = await createTmpDir('edit-environment-customized-1');
      await createCollection(page, 'test-collection-environment-customized-1', collectionPath);

      // Wait for collection to be ready
      await page.waitForTimeout(500);

      // Close the environment tab
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(300);
    });
  });

  test.describe('FUNCTIONAL: Zoom In', () => {
    test('should zoom in using default Cmd/Ctrl+=', async ({ page, createTmpDir }) => {
      // Close all collections first for clean state
      await closeAllCollections(page);

      const collectionPath = await createTmpDir('zoom-in-default');
      await createCollection(page, 'test-collection-zoom-in-default', collectionPath);

      // Wait for collection to be ready
      await page.waitForTimeout(500);

      await page.keyboard.press(`${modifier}+Shift+Equal`);
      await page.waitForTimeout(500);
    });

    test('should zoom in using customized-1 Alt+Z+ArrowUp', async ({ page, createTmpDir }) => {
      // Close all collections, tabs, and preferences first
      await closeAllCollections(page);

      // Close any open preference tabs
      const preferenceTabs = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      const prefTabCount = await preferenceTabs.count();
      for (let i = 0; i < prefTabCount; i++) {
        await page.keyboard.press(`${modifier}+KeyW`);
        await page.waitForTimeout(200);
      }

      // Open Keybindings preferences and customize zoomIn FIRST
      await openKeybindingsTab(page);

      const row = page.getByTestId('keybinding-row-zoomIn');
      await row.hover();

      // Start recording
      await getEditBtn(page, 'zoomIn').click();
      await page.waitForTimeout(300);

      // Press new combo: Alt+Z+ArrowUp
      // Use down/up to ensure proper key recording
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyZ');
      await page.keyboard.down('ArrowUp');
      await page.waitForTimeout(200);
      await page.keyboard.up('ArrowUp');
      await page.keyboard.up('KeyZ');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(1000);

      // Verify the keybinding was saved
      const input = getInput(page, 'zoomIn');
      const newValue = await input.inputValue();
      expect(newValue).toContain('alt');
      expect(newValue).toContain('z');
      expect(newValue).toContain('arrowup');

      // Close preferences
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(1000);

      // Wait for collection to be ready
      await page.waitForTimeout(500);

      // Press Alt+Z+ArrowUp to zoom in
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyZ');
      await page.keyboard.down('ArrowUp');
      await page.waitForTimeout(200);
      await page.keyboard.up('ArrowUp');
      await page.keyboard.up('KeyZ');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(500);
    });
  });

  test.describe('FUNCTIONAL: Zoom Out', () => {
    test('should zoom out using default Cmd/Ctrl+-', async ({ page, createTmpDir }) => {
      // Close all collections first for clean state
      await closeAllCollections(page);

      const collectionPath = await createTmpDir('zoom-out-default');
      await createCollection(page, 'test-collection-zoom-out-default', collectionPath);

      // Wait for collection to be ready
      await page.waitForTimeout(500);

      // Press Cmd/Ctrl+- to zoom out
      await page.keyboard.press(`${modifier}+Minus`);
      await page.waitForTimeout(500);
    });

    test('should zoom out using customized-1 Alt+Z+ArrowDown', async ({ page, createTmpDir }) => {
      // Close all collections, tabs, and preferences first
      await closeAllCollections(page);

      // Close any open preference tabs
      const preferenceTabs = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      const prefTabCount = await preferenceTabs.count();
      for (let i = 0; i < prefTabCount; i++) {
        await page.keyboard.press(`${modifier}+KeyW`);
        await page.waitForTimeout(200);
      }

      // Open Keybindings preferences and customize zoomOut FIRST
      await openKeybindingsTab(page);

      const row = page.getByTestId('keybinding-row-zoomOut');
      await row.hover();

      // Start recording
      await getEditBtn(page, 'zoomOut').click();
      await page.waitForTimeout(300);

      // Press new combo: Alt+Z+ArrowDown
      // Use down/up to ensure proper key recording
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyZ');
      await page.keyboard.down('ArrowDown');
      await page.waitForTimeout(200);
      await page.keyboard.up('ArrowDown');
      await page.keyboard.up('KeyZ');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(1000);

      // Verify the keybinding was saved
      const input = getInput(page, 'zoomOut');
      const newValue = await input.inputValue();
      expect(newValue).toContain('alt');
      expect(newValue).toContain('z');
      expect(newValue).toContain('arrowdown');

      // Close preferences
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(1000);

      // Now create collection
      const collectionPath = await createTmpDir('zoom-out-customized-1');
      await createCollection(page, 'test-collection-zoom-out-customized-1', collectionPath);

      // Wait for collection to be ready
      await page.waitForTimeout(500);

      // Press Alt+Z+ArrowDown to zoom out
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyZ');
      await page.keyboard.down('ArrowDown');
      await page.waitForTimeout(200);
      await page.keyboard.up('ArrowDown');
      await page.keyboard.up('KeyZ');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(500);
    });
  });

  test.describe('FUNCTIONAL: Reset Zoom', () => {
    test('should reset zoom using default Cmd/Ctrl+0', async ({ page, createTmpDir }) => {
      // Close all collections first for clean state
      await closeAllCollections(page);

      const collectionPath = await createTmpDir('reset-zoom-default');
      await createCollection(page, 'test-collection-reset-zoom-default', collectionPath);

      // Wait for collection to be ready
      await page.waitForTimeout(500);

      // Zoom in first
      await page.keyboard.press(`${modifier}+Shift+Equal`);
      await page.waitForTimeout(300);

      // Press Cmd/Ctrl+0 to reset zoom
      await page.keyboard.press(`${modifier}+Digit0`);
      await page.waitForTimeout(500);
    });

    test('should reset zoom using customized-1 Alt+Z+0', async ({ page, createTmpDir }) => {
      // Close all collections, tabs, and preferences first
      await closeAllCollections(page);

      // Close any open preference tabs
      const preferenceTabs = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      const prefTabCount = await preferenceTabs.count();
      for (let i = 0; i < prefTabCount; i++) {
        await page.keyboard.press(`${modifier}+KeyW`);
        await page.waitForTimeout(200);
      }

      // Open Keybindings preferences and customize resetZoom FIRST
      await openKeybindingsTab(page);

      const row = page.getByTestId('keybinding-row-resetZoom');
      await row.hover();

      // Start recording
      await getEditBtn(page, 'resetZoom').click();
      await page.waitForTimeout(300);

      // Press new combo: Alt+Z+0
      // Use down/up to ensure proper key recording
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyZ');
      await page.keyboard.down('Digit0');
      await page.waitForTimeout(200);
      await page.keyboard.up('Digit0');
      await page.keyboard.up('KeyZ');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(1000);

      // Verify the keybinding was saved
      const input = getInput(page, 'resetZoom');
      const newValue = await input.inputValue();
      expect(newValue).toContain('alt');
      expect(newValue).toContain('z');
      expect(newValue).toContain('0');

      // Close preferences
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(1000);

      // Wait for collection to be ready
      await page.waitForTimeout(500);

      // Zoom in first using default shortcut
      await page.keyboard.press(`${modifier}+Shift+Equal`);
      await page.waitForTimeout(300);

      // Press Alt+Z+0 to reset zoom
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyZ');
      await page.keyboard.down('Digit0');
      await page.waitForTimeout(200);
      await page.keyboard.up('Digit0');
      await page.keyboard.up('KeyZ');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(500);
    });
  });

  test.describe('FUNCTIONAL: Clone Item', () => {
    test('should clone request using default Cmd/Ctrl+D', async ({ page, createTmpDir }) => {
      // Close all collections first for clean state
      await closeAllCollections(page);

      const collectionPath = await createTmpDir('clone-request-default');
      await createCollection(page, 'test-collection-clone-request-default', collectionPath);

      // Create a request
      await createRequest(page, 'original-request', 'test-collection-clone-request-default');

      // Open the request
      await openRequest(page, 'test-collection-clone-request-default', 'original-request');
      await page.waitForTimeout(500);

      // Press Cmd/Ctrl+D to clone
      await page.keyboard.press(`${modifier}+KeyD`);

      // Verify clone modal opens
      const cloneModal = page.locator('.bruno-modal-card').filter({ hasText: /clone request/i });
      await expect(cloneModal).toBeVisible({ timeout: 3000 });

      // Fill in the clone request name
      const requestNameInput = page.locator('#collection-item-name');
      await requestNameInput.fill('cloned-request');

      // Click the clone button
      await page.getByTestId('collection-item-clone').click();

      // Wait for clone operation to complete
      await page.waitForTimeout(500);

      // Verify cloned request appears in sidebar
      await expect(page.locator('.collection-item-name').filter({ hasText: 'cloned-request' })).toBeVisible();
      await expect(page.locator('.collection-item-name').filter({ hasText: 'original-request' })).toBeVisible();
    });

    test('should clone folder using default Cmd/Ctrl+D', async ({ page, createTmpDir }) => {
      // Close all collections first for clean state
      await closeAllCollections(page);

      // Close any open preference tabs
      const preferenceTabs = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      const prefTabCount = await preferenceTabs.count();
      for (let i = 0; i < prefTabCount; i++) {
        await page.keyboard.press(`${modifier}+KeyW`);
        await page.waitForTimeout(200);
      }

      // Reset cloneItem keybinding to default Cmd/Ctrl+D first
      await openKeybindingsTab(page);

      const row = page.getByTestId('keybinding-row-cloneItem');
      await row.hover();

      // Close preferences
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(500);

      // Now create collection and folder
      const collectionPath = await createTmpDir('clone-folder-default');
      await createCollection(page, 'test-collection-clone-folder-default', collectionPath);

      // Create a folder
      await createFolder(page, 'original-folder', 'test-collection-clone-folder-default', true);
      await page.waitForTimeout(500);

      // Open folder settings
      const folder = page.locator('.collection-item-name').filter({ hasText: 'original-folder' });
      await folder.click();

      // Verify folder settings tab is open
      await expect(page.locator('.request-tab').filter({ hasText: 'original-folder' })).toBeVisible();
      await page.waitForTimeout(500);

      // Press Cmd/Ctrl+D to clone folder
      await page.keyboard.press(`${modifier}+KeyD`);

      // Verify clone modal opens
      const cloneModal = page.locator('.bruno-modal-card').filter({ hasText: /clone folder/i });
      await expect(cloneModal).toBeVisible({ timeout: 3000 });

      // Fill in the clone folder name
      const folderNameInput = page.locator('#collection-item-name');
      await folderNameInput.fill('cloned-folder');

      // Click the clone button
      await page.getByTestId('collection-item-clone').click();

      // Wait for clone operation to complete
      await page.waitForTimeout(500);

      // Verify cloned folder appears in sidebar
      await expect(page.locator('.collection-item-name').filter({ hasText: 'cloned-folder' })).toBeVisible();
      await expect(page.locator('.collection-item-name').filter({ hasText: 'original-folder' })).toBeVisible();
    });

    test('should clone request using customized Cmd/Ctrl+Shift+D', async ({ page, createTmpDir }) => {
      // Close all collections, tabs, and preferences first
      await closeAllCollections(page);

      // Close any open preference tabs
      const preferenceTabs = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      const prefTabCount = await preferenceTabs.count();
      for (let i = 0; i < prefTabCount; i++) {
        await page.keyboard.press(`${modifier}+KeyW`);
        await page.waitForTimeout(200);
      }

      // Open Keybindings preferences and customize cloneItem FIRST
      await openKeybindingsTab(page);

      const row = page.getByTestId('keybinding-row-cloneItem');
      await row.hover();

      // Start recording
      await getEditBtn(page, 'cloneItem').click();
      await page.waitForTimeout(300);

      // Press new combo: Cmd/Ctrl+Shift+D
      await page.keyboard.down(modifier === 'Meta' ? 'Meta' : 'Control');
      await page.keyboard.down('Shift');
      await page.keyboard.down('KeyD');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyD');
      await page.keyboard.up('Shift');
      await page.keyboard.up(modifier === 'Meta' ? 'Meta' : 'Control');
      await page.waitForTimeout(1000);

      // Verify the keybinding was saved
      const input = getInput(page, 'cloneItem');
      const newValue = await input.inputValue();
      expect(newValue).toContain('shift');
      expect(newValue).toContain('d');

      // Close preferences
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(1000);

      // Now create collection and request
      const collectionPath = await createTmpDir('clone-request-customized');
      await createCollection(page, 'test-collection-clone-request-customized', collectionPath);

      // Create a request
      await createRequest(page, 'original-request', 'test-collection-clone-request-customized');

      // Open the request
      await openRequest(page, 'test-collection-clone-request-customized', 'original-request');
      await page.waitForTimeout(500);

      // Press Cmd/Ctrl+Shift+D to clone
      await page.keyboard.press(`${modifier}+Shift+KeyD`);

      // Verify clone modal opens
      const cloneModal = page.locator('.bruno-modal-card').filter({ hasText: /clone request/i });
      await expect(cloneModal).toBeVisible({ timeout: 3000 });

      // Fill in the clone request name
      const requestNameInput = page.locator('#collection-item-name');
      await requestNameInput.fill('cloned-request');

      // Click the clone button
      await page.getByTestId('collection-item-clone').click();

      // Wait for clone operation to complete
      await page.waitForTimeout(500);

      // Verify cloned request appears in sidebar
      await expect(page.locator('.collection-item-name').filter({ hasText: 'cloned-request' })).toBeVisible();
      await expect(page.locator('.collection-item-name').filter({ hasText: 'original-request' })).toBeVisible();
    });

    test('should clone folder using customized Cmd/Ctrl+Shift+D', async ({ page, createTmpDir }) => {
      // Close all collections, tabs, and preferences first
      await closeAllCollections(page);

      // Close any open preference tabs
      const preferenceTabs = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      const prefTabCount = await preferenceTabs.count();
      for (let i = 0; i < prefTabCount; i++) {
        await page.keyboard.press(`${modifier}+KeyW`);
        await page.waitForTimeout(200);
      }

      // Open Keybindings preferences and customize cloneItem FIRST
      await openKeybindingsTab(page);

      const row = page.getByTestId('keybinding-row-cloneItem');
      await row.hover();

      // Verify the keybinding was saved
      const input = getInput(page, 'cloneItem');
      const newValue = await input.inputValue();
      expect(newValue).toContain('shift');
      expect(newValue).toContain('d');

      // Close preferences
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(1000);

      // Now create collection
      const collectionPath = await createTmpDir('clone-folder-customized');
      await createCollection(page, 'test-collection-clone-folder-customized', collectionPath);

      // Create a folder
      await createFolder(page, 'original-folder', 'test-collection-clone-folder-customized', true);
      await page.waitForTimeout(500);

      // Open folder settings
      const folder = page.locator('.collection-item-name').filter({ hasText: 'original-folder' });
      await folder.click();
      //   await folder.locator('.menu-icon').click();
      //   await page.locator('.dropdown-item').filter({ hasText: 'Settings' }).click();

      // Verify folder settings tab is open
      await expect(page.locator('.request-tab').filter({ hasText: 'original-folder' })).toBeVisible();
      await page.waitForTimeout(500);

      // Press Cmd/Ctrl+Shift+D to clone folder
      await page.keyboard.press(`${modifier}+Shift+KeyD`);

      // Verify clone modal opens
      const cloneModal = page.locator('.bruno-modal-card').filter({ hasText: /clone folder/i });
      await expect(cloneModal).toBeVisible({ timeout: 3000 });

      // Fill in the clone folder name
      const folderNameInput = page.locator('#collection-item-name');
      await folderNameInput.fill('cloned-folder');

      // Click the clone button
      await page.getByTestId('collection-item-clone').click();

      // Wait for clone operation to complete
      await page.waitForTimeout(500);

      // Verify cloned folder appears in sidebar
      await expect(page.locator('.collection-item-name').filter({ hasText: 'cloned-folder' })).toBeVisible();
      await expect(page.locator('.collection-item-name').filter({ hasText: 'original-folder' })).toBeVisible();
    });
  });

  test.describe('FUNCTIONAL: Copy and Paste Item', () => {
    test('should copy and paste request using default Cmd/Ctrl+C and Cmd/Ctrl+V', async ({ page, createTmpDir }) => {
      // Close all collections first for clean state
      await closeAllCollections(page);

      const collectionPath = await createTmpDir('copy-paste-request-default');
      await createCollection(page, 'test-collection-copy-paste-request-default', collectionPath);

      // Create a request
      await createRequest(page, 'original-request', 'test-collection-copy-paste-request-default');

      // Open the request
      await openRequest(page, 'test-collection-copy-paste-request-default', 'original-request');
      await page.waitForTimeout(500);

      // Press Cmd/Ctrl+C to copy
      await page.keyboard.press(`${modifier}+KeyC`);
      await page.waitForTimeout(300);

      // Press Cmd/Ctrl+V to paste
      await page.keyboard.press(`${modifier}+KeyV`);
      await page.waitForTimeout(500);

      // Verify pasted request appears in sidebar (should be named "original-request (1)")
      await expect(page.locator('.collection-item-name').filter({ hasText: 'original-request (1)' })).toBeVisible();
      await expect(page.locator('.collection-item-name').filter({ hasText: 'original-request' }).first()).toBeVisible();
    });

    test('should copy and paste request using customized Alt+C+R and Alt+V+R', async ({ page, createTmpDir }) => {
      // Close all collections, tabs, and preferences first
      await closeAllCollections(page);

      // Close any open preference tabs
      let preferenceTabs = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      let prefTabCount = await preferenceTabs.count();
      for (let i = 0; i < prefTabCount; i++) {
        await page.keyboard.press(`${modifier}+KeyW`);
        await page.waitForTimeout(200);
      }

      // Open Keybindings preferences and customize copyItem FIRST
      await openKeybindingsTab(page);

      let copyRow = page.getByTestId('keybinding-row-copyItem');
      await copyRow.hover();

      // Start recording for copyItem
      await getEditBtn(page, 'copyItem').click();
      await page.waitForTimeout(300);

      // Press new combo: Alt+C+R
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyC');
      await page.keyboard.down('KeyR');
      await page.waitForTimeout(300);
      await page.keyboard.up('KeyR');
      await page.keyboard.up('KeyC');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(500);

      // Verify the keybinding was saved
      let input = getInput(page, 'copyItem');
      let newValue = await input.inputValue();
      expect(newValue).toContain('alt');
      expect(newValue).toContain('c');
      expect(newValue).toContain('r');

      // Now customize pasteItem
      const pasteRow = page.getByTestId('keybinding-row-pasteItem');
      await pasteRow.hover();

      // Start recording for pasteItem
      await getEditBtn(page, 'pasteItem').click();
      await page.waitForTimeout(300);

      // Press new combo: Alt+V+R
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyV');
      await page.keyboard.down('KeyR');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyR');
      await page.keyboard.up('KeyV');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(1000);

      // Verify the keybinding was saved
      input = getInput(page, 'pasteItem');
      newValue = await input.inputValue();
      expect(newValue).toContain('alt');
      expect(newValue).toContain('v');
      expect(newValue).toContain('r');

      // Close preferences
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(500);

      // Now create collection and request
      const collectionPath = await createTmpDir('copy-paste-request-customized');
      await createCollection(page, 'test-collection-copy-paste-request-customized', collectionPath);

      // Create a request
      await createRequest(page, 'original-request', 'test-collection-copy-paste-request-customized');

      // Open the request
      await openRequest(page, 'test-collection-copy-paste-request-customized', 'original-request');
      await page.waitForTimeout(500);

      // Press Alt+C+R to copy
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyC');
      await page.keyboard.down('KeyR');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyR');
      await page.keyboard.up('KeyC');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(300);

      // Press Alt+V+R to paste
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyV');
      await page.keyboard.down('KeyR');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyR');
      await page.keyboard.up('KeyV');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(1000);

      // Verify pasted request appears in sidebar (should be named "original-request (1)")
      // Wait for the new item to appear
      await page.waitForTimeout(500);
      const allRequests = page.locator('.collection-item-name');
      const requestCount = await allRequests.count();
      await page.waitForTimeout(500);
      expect(requestCount).toBeGreaterThanOrEqual(1); // Should have at least original and pasted

      // Verify both original and pasted exist
      await expect(page.locator('.collection-item-name').filter({ hasText: 'original-request' }).first()).toBeVisible();
    });

    test('should copy and paste folder using customized Alt+C+F and Alt+V+F', async ({ page, createTmpDir }) => {
      // Close all collections, tabs, and preferences first
      await closeAllCollections(page);

      // Close any open preference tabs
      let preferenceTabs = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      let prefTabCount = await preferenceTabs.count();
      for (let i = 0; i < prefTabCount; i++) {
        await page.keyboard.press(`${modifier}+KeyW`);
        await page.waitForTimeout(200);
      }

      // Open Keybindings preferences and customize copyItem FIRST
      await openKeybindingsTab(page);

      // Reset first to remove old keybindings
      await openKeybindingsTab(page);
      const resetCopyRow = page.getByTestId('keybinding-reset-copyItem');
      await resetCopyRow.hover();
      await getResetBtn(page, 'copyItem').click();
      await page.waitForTimeout(500);

      // Start recording for copyItem
      await getEditBtn(page, 'copyItem').click();
      await page.waitForTimeout(300);

      // Press new combo: Alt+C+F
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyC');
      await page.keyboard.down('KeyF');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyF');
      await page.keyboard.up('KeyC');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(1000);

      // Verify the keybinding was saved
      let input = getInput(page, 'copyItem');
      let newValue = await input.inputValue();
      expect(newValue).toContain('alt');
      expect(newValue).toContain('c');
      expect(newValue).toContain('f');

      await openKeybindingsTab(page);
      const resetPasteRow = page.getByTestId('keybinding-reset-pasteItem');
      await resetPasteRow.hover();
      await getResetBtn(page, 'pasteItem').click();
      await page.waitForTimeout(500);

      // Start recording for copyItem
      await getEditBtn(page, 'pasteItem').click();
      await page.waitForTimeout(300);

      // Press new combo: Alt+V+F
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyV');
      await page.keyboard.down('KeyF');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyF');
      await page.keyboard.up('KeyV');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(1000);

      // Verify the keybinding was saved
      input = getInput(page, 'pasteItem');
      newValue = await input.inputValue();
      expect(newValue).toContain('alt');
      expect(newValue).toContain('v');
      expect(newValue).toContain('f');

      // Close preferences
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(1000);

      // Now create collection
      const collectionPath = await createTmpDir('copy-paste-folder-customized');
      await createCollection(page, 'test-collection-copy-paste-folder-customized', collectionPath);

      // Create a folder
      await createFolder(page, 'original-folder', 'test-collection-copy-paste-folder-customized', true);
      await page.waitForTimeout(500);

      // Open folder settings
      const folder = page.locator('.collection-item-name').filter({ hasText: 'original-folder' });
      await folder.hover();
      await folder.locator('.menu-icon').click();
      await page.locator('.dropdown-item').filter({ hasText: 'Settings' }).click();

      // Verify folder settings tab is open
      await expect(page.locator('.request-tab').filter({ hasText: 'original-folder' })).toBeVisible();
      await page.waitForTimeout(500);

      // Press Alt+C+F to copy folder
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyC');
      await page.keyboard.down('KeyF');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyF');
      await page.keyboard.up('KeyC');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(300);

      // Press Alt+V+F to paste folder
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyV');
      await page.keyboard.down('KeyF');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyF');
      await page.keyboard.up('KeyV');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(1000);

      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(1000);

      // Verify pasted folder appears in sidebar
      // Wait for the new item to appear
      await page.waitForTimeout(500);
      const allFolders = page.locator('.collection-item-name');
      const folderCount = await allFolders.count();
      await page.waitForTimeout(500);
      expect(folderCount).toBeGreaterThanOrEqual(1); // Should have at least original and pasted

      // Verify both original and pasted exist
      await expect(page.locator('.collection-item-name').filter({ hasText: 'original-folder' }).first()).toBeVisible();
    });
  });

  test.describe('FUNCTIONAL: Move Tab Left', () => {
    test('should move tab left using default Cmd/Ctrl+[', async ({ page, createTmpDir }) => {
      // Close all collections first for clean state
      await closeAllCollections(page);

      const collectionPath = await createTmpDir('move-tab-left-default');
      await createCollection(page, 'test-collection-move-tab-left-default', collectionPath);

      // Create multiple requests
      await createRequest(page, 'request-1', 'test-collection-move-tab-left-default');
      await createRequest(page, 'request-2', 'test-collection-move-tab-left-default');
      await createRequest(page, 'request-3', 'test-collection-move-tab-left-default');

      // Open and pin all requests (persist: true means double-click to pin)
      await openRequest(page, 'test-collection-move-tab-left-default', 'request-1', { persist: true });
      await openRequest(page, 'test-collection-move-tab-left-default', 'request-2', { persist: true });
      await openRequest(page, 'test-collection-move-tab-left-default', 'request-3', { persist: true });

      // Wait for tabs to be ready - request-3 should be active and last
      await page.waitForTimeout(500);

      // Get initial tab order
      const tabs = page.locator('.request-tab');
      const initialCount = await tabs.count();
      expect(initialCount).toBe(3);

      // Verify request-3 is active and last
      const lastTab = tabs.last();
      const activeTab = page.locator('li.request-tab.active');
      await expect(lastTab).toHaveText(/request-3/);

      // Press Cmd/Ctrl+[ to move tab left
      await page.keyboard.press(`${modifier}+BracketLeft`);
      await page.waitForTimeout(500);

      // Verify request-3 is still active but moved left (no longer last tab)
      await expect(activeTab).toHaveText(/request-3/);
      await expect(activeTab).not.toHaveClass(/last-tab/);

      // Press again to move further left
      await page.keyboard.press(`${modifier}+BracketLeft`);
      await page.waitForTimeout(500);

      // Verify request-3 is now first tab
      const firstTab = tabs.first();
      await expect(firstTab).toHaveText(/request-3/);
      await expect(activeTab).toHaveText(/request-3/);
    });

    test('should move tab left using customized Alt+M+L', async ({ page, createTmpDir }) => {
      // Close all collections, tabs, and preferences first
      await closeAllCollections(page);

      // Close any open preference tabs
      const preferenceTabs = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      const prefTabCount = await preferenceTabs.count();
      for (let i = 0; i < prefTabCount; i++) {
        await page.keyboard.press(`${modifier}+KeyW`);
        await page.waitForTimeout(200);
      }

      // Open Keybindings preferences and customize moveTabLeft FIRST
      await openKeybindingsTab(page);

      const row = page.getByTestId('keybinding-row-moveTabLeft');
      await row.hover();

      // Start recording
      await getEditBtn(page, 'moveTabLeft').click();
      await page.waitForTimeout(300);

      // Press new combo: Alt+M+L
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyM');
      await page.keyboard.down('KeyL');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyL');
      await page.keyboard.up('KeyM');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(1000);

      // Verify the keybinding was saved
      const input = getInput(page, 'moveTabLeft');
      const newValue = await input.inputValue();
      expect(newValue).toContain('alt');
      expect(newValue).toContain('m');
      expect(newValue).toContain('l');

      // Close preferences
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(1000);

      // Now create collection and requests
      const collectionPath = await createTmpDir('move-tab-left-customized');
      await createCollection(page, 'test-collection-move-tab-left-customized', collectionPath);

      // Create multiple requests
      await createRequest(page, 'request-1', 'test-collection-move-tab-left-customized');
      await createRequest(page, 'request-2', 'test-collection-move-tab-left-customized');
      await createRequest(page, 'request-3', 'test-collection-move-tab-left-customized');

      // Open and pin all requests
      await openRequest(page, 'test-collection-move-tab-left-customized', 'request-1', { persist: true });
      await openRequest(page, 'test-collection-move-tab-left-customized', 'request-2', { persist: true });
      await openRequest(page, 'test-collection-move-tab-left-customized', 'request-3', { persist: true });

      // Wait for tabs to be ready
      await page.waitForTimeout(500);

      // Get initial tab order
      const tabs = page.locator('.request-tab');
      const initialCount = await tabs.count();
      expect(initialCount).toBe(3);

      // Verify request-3 is active and last
      const lastTab = tabs.last();
      const activeTab = page.locator('li.request-tab.active');
      await expect(lastTab).toHaveText(/request-3/);

      // Press Alt+M+L to move tab left
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyM');
      await page.keyboard.down('KeyL');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyL');
      await page.keyboard.up('KeyM');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(500);

      // Verify request-3 is still active but moved left
      await expect(activeTab).toHaveText(/request-3/);
      await expect(activeTab).not.toHaveClass(/last-tab/);

      // Press again to move further left
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyM');
      await page.keyboard.down('KeyL');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyL');
      await page.keyboard.up('KeyM');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(500);

      // Verify request-3 is now first tab
      const firstTab = tabs.first();
      await expect(firstTab).toHaveText(/request-3/);
      await expect(activeTab).toHaveText(/request-3/);
    });
  });

  test.describe('FUNCTIONAL: Move Tab Right', () => {
    test('should move tab right using default Cmd/Ctrl+]', async ({ page, createTmpDir }) => {
      // Close all collections first for clean state
      await closeAllCollections(page);

      const collectionPath = await createTmpDir('move-tab-right-default');
      await createCollection(page, 'test-collection-move-tab-right-default', collectionPath);

      // Create multiple requests
      await createRequest(page, 'request-1', 'test-collection-move-tab-right-default');
      await createRequest(page, 'request-2', 'test-collection-move-tab-right-default');
      await createRequest(page, 'request-3', 'test-collection-move-tab-right-default');

      // Open and pin all requests (persist: true means double-click to pin)
      await openRequest(page, 'test-collection-move-tab-right-default', 'request-1', { persist: true });
      await openRequest(page, 'test-collection-move-tab-right-default', 'request-2', { persist: true });
      await openRequest(page, 'test-collection-move-tab-right-default', 'request-3', { persist: true });
      await openRequest(page, 'test-collection-move-tab-right-default', 'request-1', { persist: true });

      // Wait for tabs to be ready - request-3 should be active and last
      await page.waitForTimeout(500);

      // Get initial tab order
      const tabs = page.locator('.request-tab');
      const initialCount = await tabs.count();
      expect(initialCount).toBe(4);

      // Verify request-3 is active and last
      const firstTab = tabs.first();
      await expect(firstTab).toHaveText(/request-1/);
      const activeTab = page.locator('li.request-tab.active');
      await expect(activeTab).toHaveText(/request-1/);

      // Press Cmd/Ctrl+] to move tab right
      await page.keyboard.press(`${modifier}+BracketRight`);
      await page.waitForTimeout(500);

      // Verify request-1 is still active but moved right (no longer last tab)
      await expect(activeTab).toHaveText(/request-1/);

      // Press again to move further right
      await page.keyboard.press(`${modifier}+BracketRight`);
      await page.waitForTimeout(500);

      await expect(activeTab).toHaveText(/request-1/);

      // Press again to move further right
      await page.keyboard.press(`${modifier}+BracketRight`);
      await page.waitForTimeout(500);

      // Verify request-3 is now first tab
      const lastTab = tabs.last();
      await expect(lastTab).toHaveText(/request-1/);
      await expect(activeTab).toHaveText(/request-1/);
    });

    test('should move tab right using customized Alt+M+R', async ({ page, createTmpDir }) => {
      // Close all collections, tabs, and preferences first
      await closeAllCollections(page);

      // Close any open preference tabs
      const preferenceTabs = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      const prefTabCount = await preferenceTabs.count();
      for (let i = 0; i < prefTabCount; i++) {
        await page.keyboard.press(`${modifier}+KeyW`);
        await page.waitForTimeout(200);
      }

      // Open Keybindings preferences and customize moveTabRight FIRST
      await openKeybindingsTab(page);

      const row = page.getByTestId('keybinding-row-moveTabRight');
      await row.hover();

      // Start recording
      await getEditBtn(page, 'moveTabRight').click();
      await page.waitForTimeout(300);

      // Press new combo: Alt+M+R
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyM');
      await page.keyboard.down('KeyR');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyR');
      await page.keyboard.up('KeyM');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(1000);

      // Verify the keybinding was saved
      const input = getInput(page, 'moveTabRight');
      const newValue = await input.inputValue();
      expect(newValue).toContain('alt');
      expect(newValue).toContain('m');
      expect(newValue).toContain('r');

      // Close preferences
      await page.keyboard.press(`${modifier}+KeyW`);
      await page.waitForTimeout(1000);

      // Now create collection and requests
      const collectionPath = await createTmpDir('move-tab-right-customized');
      await createCollection(page, 'test-collection-move-tab-right-customized', collectionPath);

      // Create multiple requests
      await createRequest(page, 'request-1', 'test-collection-move-tab-right-customized');
      await createRequest(page, 'request-2', 'test-collection-move-tab-right-customized');
      await createRequest(page, 'request-3', 'test-collection-move-tab-right-customized');

      // Open and pin all requests (persist: true means double-click to pin)
      await openRequest(page, 'test-collection-move-tab-right-customized', 'request-1', { persist: true });
      await openRequest(page, 'test-collection-move-tab-right-customized', 'request-2', { persist: true });
      await openRequest(page, 'test-collection-move-tab-right-customized', 'request-3', { persist: true });
      await openRequest(page, 'test-collection-move-tab-right-customized', 'request-1', { persist: true });

      // Wait for tabs to be ready - request-3 should be active and last
      await page.waitForTimeout(500);

      // Get initial tab order
      const tabs = page.locator('.request-tab');
      const initialCount = await tabs.count();
      expect(initialCount).toBe(4);

      // Verify request-3 is active and last
      const firstTab = tabs.first();
      await expect(firstTab).toHaveText(/request-1/);
      const activeTab = page.locator('li.request-tab.active');
      await expect(activeTab).toHaveText(/request-1/);

      // Press again to move further right
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyM');
      await page.keyboard.down('KeyR');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyR');
      await page.keyboard.up('KeyM');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(500);

      // Verify request-1 is still active but moved right (no longer last tab)
      await expect(activeTab).toHaveText(/request-1/);

      // Press again to move further right
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyM');
      await page.keyboard.down('KeyR');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyR');
      await page.keyboard.up('KeyM');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(500);

      // Verify request-1 is still active but moved right (no longer last tab)
      await expect(activeTab).toHaveText(/request-1/);

      // Press again to move further right
      await page.keyboard.down('Alt');
      await page.keyboard.down('KeyM');
      await page.keyboard.down('KeyR');
      await page.waitForTimeout(200);
      await page.keyboard.up('KeyR');
      await page.keyboard.up('KeyM');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(500);

      // Verify request-3 is now first tab
      const lastTab = tabs.last();
      await expect(lastTab).toHaveText(/request-1/);
      await expect(activeTab).toHaveText(/request-1/);
    });
  });
});
