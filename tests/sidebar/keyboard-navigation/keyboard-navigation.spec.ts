import { test, expect, closeElectronApp } from '../../../playwright';
import path from 'path';
import { buildCommonLocators, collapseFolder, expandCollection, expandFolder, waitForReadyPage } from '../../utils/page';
import { initBruCollection, writeBruFolder, writeBruRequest } from '../../utils/fixtures/bru-collection';

const COLLECTION_NAME = 'KeyboardNavCol';
const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
const focusSidebarShortcut = `${modifier}+Shift+KeyE`;

const launchWithCollection = async (launchElectronApp, createTmpDir, tag: string, buildCollection: (dir: string) => void) => {
  const collectionDir = path.join(await createTmpDir(tag), COLLECTION_NAME);
  buildCollection(collectionDir);

  const app = await launchElectronApp({
    initUserDataPath: path.join(__dirname, 'init-user-data'),
    templateVars: { collectionPath: collectionDir.split(path.sep).join('/') }
  });
  const page = await waitForReadyPage(app);

  return { app, page, locators: buildCommonLocators(page) };
};

test.describe('Sidebar keyboard navigation', () => {
  test('clicking a row focuses it and tree keys navigate, expand, collapse, and open', async ({ launchElectronApp, createTmpDir }) => {
    const { app, page, locators } = await launchWithCollection(
      launchElectronApp,
      createTmpDir,
      'sidebar-keyboard-tree',
      (dir) => {
        initBruCollection(dir, COLLECTION_NAME);
        const folder = writeBruFolder(dir, 'folder-a', 1);
        writeBruRequest(folder, 'child-req', { seq: 1 });
        writeBruRequest(dir, 'second-req', { seq: 1 });
      }
    );

    const collectionRow = locators.sidebar.collectionRow(COLLECTION_NAME);
    const folderRow = locators.sidebar.itemRow('folder-a');
    const childRow = locators.sidebar.itemRow('child-req');
    const secondRow = locators.sidebar.itemRow('second-req');
    const searchInput = locators.sidebar.searchInput();

    try {
      await test.step('clicking a row gives it keyboard focus', async () => {
        await expect(collectionRow).toBeVisible();
        await collectionRow.click();

        await expect(collectionRow).toBeFocused();
        await expect(folderRow).toBeVisible();
      });

      await test.step('ArrowRight moves into the expanded collection', async () => {
        await page.keyboard.press('ArrowRight');
        await expect(folderRow).toBeFocused();
      });

      await test.step('ArrowLeft on a collapsed folder moves to its parent', async () => {
        await page.keyboard.press('ArrowLeft');
        await expect(collectionRow).toBeFocused();
      });

      await test.step('ArrowRight expands a folder before moving into it', async () => {
        await page.keyboard.press('ArrowRight');
        await expect(folderRow).toBeFocused();

        await page.keyboard.press('ArrowRight');
        await expect(childRow).toBeVisible();
        await expect(folderRow).toBeFocused();

        await page.keyboard.press('ArrowRight');
        await expect(childRow).toBeFocused();
      });

      await test.step('ArrowLeft collapses an expanded folder, then moves to its parent', async () => {
        await page.keyboard.press('ArrowLeft');
        await expect(folderRow).toBeFocused();

        await page.keyboard.press('ArrowLeft');
        await expect(childRow).toHaveCount(0);
        await expect(folderRow).toBeFocused();

        await page.keyboard.press('ArrowLeft');
        await expect(collectionRow).toBeFocused();
      });

      await test.step('Enter opens the focused request', async () => {
        await page.keyboard.press('ArrowRight');
        await expect(folderRow).toBeFocused();
        await page.keyboard.press('ArrowRight');
        await expect(childRow).toBeVisible();
        await page.keyboard.press('ArrowRight');
        await expect(childRow).toBeFocused();

        await page.keyboard.press('Enter');

        await expect(locators.tabs.activeRequestTab()).toContainText('child-req');
        await expect(childRow).toBeFocused();
      });

      await test.step('unmodified arrows move exactly one row', async () => {
        await page.keyboard.press('ArrowLeft');
        await expect(folderRow).toBeFocused();

        await page.keyboard.press('ArrowUp');
        await expect(collectionRow).toBeFocused();

        await page.keyboard.press('ArrowDown');
        await expect(folderRow).toBeFocused();
      });

      await test.step('Home and End jump to the first and last visible row', async () => {
        await page.keyboard.press('End');
        await expect(secondRow).toBeFocused();

        await page.keyboard.press('Home');
        await expect(collectionRow).toBeFocused();
      });

      await test.step('Escape returns focus to the previously focused element', async () => {
        await locators.sidebar.searchToggle().click();
        await expect(searchInput).toBeFocused();

        await collectionRow.click();
        await expect(collectionRow).toBeFocused();

        await page.keyboard.press('Escape');
        await expect(searchInput).toBeFocused();
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('the focus shortcut reveals the active tab, clears search, and reopens a collapsed section', async ({ launchElectronApp, createTmpDir }) => {
    const { app, page, locators } = await launchWithCollection(
      launchElectronApp,
      createTmpDir,
      'sidebar-keyboard-focus-shortcut',
      (dir) => {
        initBruCollection(dir, COLLECTION_NAME);
        const folderA = writeBruFolder(dir, 'folder-a', 1);
        const folderB = writeBruFolder(folderA, 'folder-b', 1);
        writeBruRequest(folderB, 'deep-req', { seq: 1 });
        writeBruRequest(dir, 'top-req', { seq: 1 });
      }
    );

    const collectionRow = locators.sidebar.collectionRow(COLLECTION_NAME);
    const collectionChevron = locators.sidebar.collectionChevron(COLLECTION_NAME);
    const folderARow = locators.sidebar.itemRow('folder-a');
    const deepRow = locators.sidebar.itemRow('deep-req');
    const searchInput = locators.sidebar.searchInput();
    const collectionsSectionHeader = locators.sidebar.sectionHeader('Collections');
    const sidebar = locators.sidebar.sidebarContainer();

    try {
      await test.step('Open a deeply nested request in a persistent tab', async () => {
        await expandCollection(page, COLLECTION_NAME);
        await expect(folderARow).toBeVisible({ timeout: 15000 });

        await expandFolder(page, 'folder-a');
        await expandFolder(page, 'folder-b');
        await deepRow.dblclick();

        await expect(locators.tabs.activeRequestTab()).toContainText('deep-req');
      });

      await test.step('Collapse the request folder and the whole collection', async () => {
        await collapseFolder(page, 'folder-a');
        await expect(deepRow).toHaveCount(0);

        await collectionChevron.click();
        await expect(folderARow).toHaveCount(0);
        await expect(locators.tabs.activeRequestTab()).toContainText('deep-req');
      });

      await test.step('Filter the sidebar so the active request is hidden', async () => {
        await locators.sidebar.searchToggle().click();
        await searchInput.fill('top');
        await expect(deepRow).toHaveCount(0);
      });

      await test.step('the shortcut clears the filter and focuses the active request', async () => {
        await page.keyboard.press(focusSidebarShortcut);

        await expect(searchInput).toHaveValue('');
        await expect(deepRow).toBeVisible();
        await expect(deepRow).toBeFocused();
        await expect(deepRow).toHaveClass(/item-keyboard-focused/);
        await expect(collectionRow).toBeVisible();
      });

      await test.step('the shortcut reopens a collapsed Collections section', async () => {
        await collectionsSectionHeader.click();
        await expect(collectionRow).toHaveCount(0);

        await page.keyboard.press(focusSidebarShortcut);

        await expect(deepRow).toBeVisible();
        await expect(deepRow).toBeFocused();
      });

      await test.step('the shortcut reopens a collapsed sidebar', async () => {
        await locators.sidebar.toggleSidebarButton().click();
        await expect.poll(() => sidebar.evaluate((el: HTMLElement) => el.offsetWidth)).toBe(0);

        await page.keyboard.press(focusSidebarShortcut);

        await expect.poll(() => sidebar.evaluate((el: HTMLElement) => el.offsetWidth)).toBeGreaterThan(0);
        await expect(deepRow).toBeFocused();
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('the rename shortcut works on the focused row', async ({ launchElectronApp, createTmpDir }) => {
    const { app, page, locators } = await launchWithCollection(
      launchElectronApp,
      createTmpDir,
      'sidebar-keyboard-rename',
      (dir) => {
        initBruCollection(dir, COLLECTION_NAME);
        writeBruRequest(dir, 'rename-me', { seq: 1 });
      }
    );

    const collectionRow = locators.sidebar.collectionRow(COLLECTION_NAME);
    const requestRow = locators.sidebar.itemRow('rename-me');
    const renamedRow = locators.sidebar.itemRow('renamed-req');

    try {
      await test.step('focus the request row with the tree keys', async () => {
        await expect(collectionRow).toBeVisible();
        await collectionRow.click();
        await expect(collectionRow).toBeFocused();

        await page.keyboard.press('ArrowRight');
        await expect(requestRow).toBeFocused();
      });

      await test.step('rename it with the sidebar shortcut', async () => {
        await page.keyboard.press(`${modifier}+KeyR`);

        const nameInput = locators.sidebar.renameItemModal.nameInput();
        await expect(nameInput).toBeVisible();
        await nameInput.fill('renamed-req');
        await locators.sidebar.renameItemModal.submit().click();
      });

      await test.step('the renamed row replaces the old one', async () => {
        await expect(renamedRow).toBeVisible();
        await expect(requestRow).toHaveCount(0);
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
