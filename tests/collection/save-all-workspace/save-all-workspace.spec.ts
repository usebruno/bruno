import fs from 'fs';
import path from 'path';
import { test, expect, Page } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  closePreferences,
  createApp,
  createCollection,
  createExampleFromSidebar,
  createRequest,
  createTransientRequest,
  fillRequestUrl,
  openExampleFromSidebar,
  openPreferences,
  openRequest,
  saveTransientViaModal,
  selectAppView,
  selectPreferencesTab,
  setCodeMirrorValue
} from '../../utils/page';

const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
const saveAllInWorkspaceShortcut = 'Alt+Shift+KeyS';
const saveAllTabsShortcut = `${modifier}+Shift+KeyS`;
const savedToast = 'Changes saved successfully';
const firstCollection = 'save-all-one';
const secondCollection = 'save-all-two';
const richRequestFixture = path.join(__dirname, 'fixtures', 'rich-request.yml');

const readAllFiles = (dir: string): string =>
  fs.readdirSync(dir, { withFileTypes: true })
    .map((entry) => {
      const entryPath = path.join(dir, entry.name);
      return entry.isDirectory() ? readAllFiles(entryPath) : fs.readFileSync(entryPath, 'utf8');
    })
    .join('\n');

const draftIndicatorOf = (page: Page, requestName: string) => {
  const { tabs } = buildCommonLocators(page);
  return tabs.tabDraftIndicator(tabs.requestTab(requestName).locator('..'));
};

const openCollectionsMenu = async (page: Page) => {
  const { sidebar } = buildCommonLocators(page);
  await sidebar.collectionsActionsMenu().click();
  await expect(sidebar.saveAllButton()).toBeVisible();
};

const saveAllFromCollectionsMenu = async (page: Page) => {
  const { sidebar } = buildCommonLocators(page);
  await openCollectionsMenu(page);
  await expect(sidebar.saveAllButton()).not.toHaveAttribute('aria-disabled', 'true');
  await sidebar.saveAllButton().click();
};

const expectSaveAllDisabled = async (page: Page) => {
  await openCollectionsMenu(page);
  await expect(buildCommonLocators(page).sidebar.saveAllButton()).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Escape');
};

const editRequestUrl = async (page: Page, collectionName: string, requestName: string, url: string) => {
  await openRequest(page, collectionName, requestName, { persist: true });
  await fillRequestUrl(page, url, { replace: true });
  await expect(draftIndicatorOf(page, requestName)).toBeVisible();
};

test.describe('Save all across the workspace', () => {
  let collectionsDir: string;

  test.beforeEach(async ({ page, createTmpDir }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
    await closeAllCollections(page);

    collectionsDir = await createTmpDir('save-all-workspace');
    await createCollection(page, firstCollection, collectionsDir);
    await createRequest(page, 'req-one', firstCollection, { url: 'https://example.com/one' });
    await createCollection(page, secondCollection, collectionsDir);
    await createRequest(page, 'req-two', secondCollection, { url: 'https://example.com/two' });
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('menu item saves drafts in every collection of the workspace', async ({ page }) => {
    const { toast } = buildCommonLocators(page);

    await test.step('Save all is disabled while nothing is unsaved', async () => {
      await expectSaveAllDisabled(page);
    });

    await test.step('Edit a request in each collection', async () => {
      await editRequestUrl(page, firstCollection, 'req-one', 'https://example.com/one-edited');
      await editRequestUrl(page, secondCollection, 'req-two', 'https://example.com/two-edited');
    });

    await test.step('Save all from the Collections menu', async () => {
      await saveAllFromCollectionsMenu(page);
      await expect(toast.byMessage(savedToast).last()).toBeVisible();
    });

    await test.step('Both requests are written to disk and their tabs are clean', async () => {
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('https://example.com/one-edited');
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('https://example.com/two-edited');

      await expect(draftIndicatorOf(page, 'req-two')).not.toBeVisible();
      await openRequest(page, firstCollection, 'req-one', { persist: true });
      await expect(draftIndicatorOf(page, 'req-one')).not.toBeVisible();
    });

    await test.step('Save all is disabled again', async () => {
      await expectSaveAllDisabled(page);
    });
  });

  test('the workspace save-all shortcut is listed in the keybindings reference', async ({ page }) => {
    const { keybindings } = buildCommonLocators(page).preferences;

    await test.step('Open the Keybindings preferences', async () => {
      await openPreferences(page);
      await selectPreferencesTab(page, 'Keybindings');
    });

    await test.step('Both save-all shortcuts are listed', async () => {
      await expect(keybindings.row('saveAllWorkspace')).toContainText('Save All in Workspace');
      await expect(keybindings.row('saveAllTabs')).toContainText('Save All Tabs');
    });

    await test.step('Close Preferences', async () => {
      await closePreferences(page);
    });
  });

  test('the collection save-all shortcut still saves only the active collection', async ({ page }) => {
    await test.step('Edit a request in each collection, ending on the second collection', async () => {
      await editRequestUrl(page, firstCollection, 'req-one', 'https://example.com/one-collection-only');
      await editRequestUrl(page, secondCollection, 'req-two', 'https://example.com/two-collection-only');
    });

    await test.step('Press the collection save-all shortcut', async () => {
      await page.keyboard.press(saveAllTabsShortcut);
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('https://example.com/two-collection-only');
      await expect(draftIndicatorOf(page, 'req-two')).not.toBeVisible();
    });

    await test.step('The other collection is still unsaved', async () => {
      expect(readAllFiles(collectionsDir)).not.toContain('https://example.com/one-collection-only');
      await openRequest(page, firstCollection, 'req-one', { persist: true });
      await expect(draftIndicatorOf(page, 'req-one')).toBeVisible();
    });
  });

  test('shortcut saves drafts across collections, then asks where to save a transient request', async ({ page }) => {
    const { tabs, toast, fileMode } = buildCommonLocators(page);

    await test.step('Edit a request in each collection and a transient request', async () => {
      await editRequestUrl(page, firstCollection, 'req-one', 'https://example.com/one-shortcut');
      await editRequestUrl(page, secondCollection, 'req-two', 'https://example.com/two-shortcut');
      await createTransientRequest(page);
      await fillRequestUrl(page, 'https://example.com/transient-draft', { replace: true });
      await expect(tabs.draftIndicator()).toBeVisible();
    });

    await test.step('Press the workspace save-all shortcut', async () => {
      await page.keyboard.press(saveAllInWorkspaceShortcut);
      await expect(toast.byMessage(savedToast).last()).toBeVisible();
    });

    await test.step('Saved requests are on disk and the save dialog is open for the transient request', async () => {
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('https://example.com/one-shortcut');
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('https://example.com/two-shortcut');
      await expect(fileMode.transientSaveModal.card()).toBeVisible();
    });

    await test.step('Saving through the dialog writes the transient request', async () => {
      await saveTransientViaModal(page, 'transient-saved', { collectionName: secondCollection });
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('https://example.com/transient-draft');
    });
  });

  test('menu item saves a request whose only unsaved change is an example', async ({ page }) => {
    const { tabs, toast, responseExample } = buildCommonLocators(page);

    await test.step('Create an example and rename it without saving', async () => {
      await createExampleFromSidebar(page, 'req-one', 'example-created');
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('example-created');
      await responseExample.editNameInput().fill('example-renamed');
      await expect(tabs.draftIndicator()).toBeVisible();
    });

    await test.step('Save all from the Collections menu', async () => {
      await saveAllFromCollectionsMenu(page);
      await expect(toast.byMessage(savedToast).last()).toBeVisible();
    });

    await test.step('The renamed example is on disk and the tab is clean', async () => {
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('example-renamed');
      await expect(tabs.draftIndicator()).not.toBeVisible();
    });
  });

  test('menu item clears the unsaved indicator of a request with scripts, docs and an example', async ({ page }) => {
    const { tabs, toast, responseExample } = buildCommonLocators(page);

    await test.step('Add a request file with tags, tests, settings, docs and an example', async () => {
      fs.copyFileSync(richRequestFixture, path.join(collectionsDir, firstCollection, 'rich-request.yml'));
      await openRequest(page, firstCollection, 'rich-request', { persist: true });
    });

    await test.step('Rename its example without saving', async () => {
      await openExampleFromSidebar(page, 'rich-request', 'rich-example');
      await responseExample.editButton().click();
      await responseExample.editNameInput().fill('rich-example-renamed');
      await expect(tabs.draftIndicator()).toBeVisible();
    });

    await test.step('Save all from the Collections menu', async () => {
      await saveAllFromCollectionsMenu(page);
      await expect(toast.byMessage(savedToast).last()).toBeVisible();
    });

    await test.step('The change is on disk, the tab is clean and the example left edit mode', async () => {
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('rich-example-renamed');
      await expect(tabs.draftIndicator()).not.toBeVisible();
      await expect(responseExample.saveButton()).not.toBeVisible();
      await expect(responseExample.editButton()).toBeVisible();
    });
  });

  test('menu item saves an edited app', async ({ page }) => {
    const { tabs, toast, collectionApp } = buildCommonLocators(page);

    await test.step('Create an app and edit its code without saving', async () => {
      await createApp(page, 'save-all-app', { collectionName: firstCollection });
      await selectAppView(page, 'code');
      const editor = collectionApp.codeEditor().first();
      await editor.waitFor({ state: 'visible' });
      await setCodeMirrorValue(editor, '<p>save-all-app-code</p>');
      await expect(tabs.draftIndicator()).toBeVisible();
    });

    await test.step('Save all from the Collections menu', async () => {
      await saveAllFromCollectionsMenu(page);
      await expect(toast.byMessage(savedToast).last()).toBeVisible();
    });

    await test.step('The app code is on disk and the tab is clean', async () => {
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('save-all-app-code');
      await expect(tabs.draftIndicator()).not.toBeVisible();
    });
  });

  test('shortcut saves an example edit while focus is in the example name field', async ({ page }) => {
    const { toast, responseExample } = buildCommonLocators(page);

    await test.step('Create an example and rename it, keeping focus in the name field', async () => {
      await createExampleFromSidebar(page, 'req-one', 'example-created');
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('example-created');
      await responseExample.editNameInput().fill('example-renamed-by-shortcut');
      await expect(responseExample.editNameInput()).toBeFocused();
    });

    await test.step('Press the workspace save-all shortcut', async () => {
      await page.keyboard.press(saveAllInWorkspaceShortcut);
      await expect(toast.byMessage(savedToast).last()).toBeVisible();
    });

    await test.step('The rename is on disk, saved once, and the example left edit mode', async () => {
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('example-renamed-by-shortcut');
      await expect(responseExample.saveButton()).not.toBeVisible();
      await expect(toast.byMessage('Request saved successfully')).toHaveCount(0);
    });
  });

  test('menu item is enabled for an edited scratch request and asks where to save it', async ({ page }) => {
    const { tabs, titleBar } = buildCommonLocators(page);

    await test.step('Edit a scratch request on the workspace overview', async () => {
      await titleBar.homeButton().click();
      await createTransientRequest(page);
      await fillRequestUrl(page, 'https://example.com/scratch-draft', { replace: true });
      await expect(tabs.draftIndicator()).toBeVisible();
    });

    await test.step('Save all from the Collections menu', async () => {
      await saveAllFromCollectionsMenu(page);
    });

    await test.step('The save dialog opens for the scratch request and saves it', async () => {
      await saveTransientViaModal(page, 'scratch-saved', { collectionName: firstCollection });
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('https://example.com/scratch-draft');
    });
  });
});
