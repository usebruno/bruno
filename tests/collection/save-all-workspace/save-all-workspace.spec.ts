import fs from 'fs';
import path from 'path';
import { test, expect, Page } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  createTransientRequest,
  fillRequestUrl,
  openRequest,
  saveTransientViaModal
} from '../../utils/page';

const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
const firstCollection = 'save-all-one';
const secondCollection = 'save-all-two';

const readAllFiles = (dir: string): string =>
  fs.readdirSync(dir, { withFileTypes: true })
    .map((entry) => {
      const entryPath = path.join(dir, entry.name);
      return entry.isDirectory() ? readAllFiles(entryPath) : fs.readFileSync(entryPath, 'utf8');
    })
    .join('\n');

const saveAllMenuItem = (page: Page) => buildCommonLocators(page).sidebar.saveAllButton();

const draftIndicatorOf = (page: Page, requestName: string) => {
  const { tabs } = buildCommonLocators(page);
  return tabs.tabDraftIndicator(tabs.requestTab(requestName).locator('..'));
};

const openCollectionsMenu = async (page: Page) => {
  await buildCommonLocators(page).sidebar.collectionsActionsMenu().click();
  await expect(saveAllMenuItem(page)).toBeVisible();
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
    await test.step('Save all is disabled while nothing is unsaved', async () => {
      await openCollectionsMenu(page);
      await expect(saveAllMenuItem(page)).toHaveAttribute('aria-disabled', 'true');
      await page.keyboard.press('Escape');
    });

    await test.step('Edit a request in each collection', async () => {
      await editRequestUrl(page, firstCollection, 'req-one', 'https://example.com/one-edited');
      await editRequestUrl(page, secondCollection, 'req-two', 'https://example.com/two-edited');
    });

    await test.step('Save all from the Collections menu', async () => {
      await openCollectionsMenu(page);
      await expect(saveAllMenuItem(page)).not.toHaveAttribute('aria-disabled', 'true');
      await saveAllMenuItem(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
    });

    await test.step('Both requests are written to disk and their tabs are clean', async () => {
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('https://example.com/one-edited');
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('https://example.com/two-edited');

      await expect(draftIndicatorOf(page, 'req-two')).not.toBeVisible();
      await openRequest(page, firstCollection, 'req-one', { persist: true });
      await expect(draftIndicatorOf(page, 'req-one')).not.toBeVisible();
    });

    await test.step('Save all is disabled again', async () => {
      await openCollectionsMenu(page);
      await expect(saveAllMenuItem(page)).toHaveAttribute('aria-disabled', 'true');
      await page.keyboard.press('Escape');
    });
  });

  test('shortcut saves drafts across collections, then asks where to save a transient request', async ({ page }) => {
    await test.step('Edit a request in each collection and a transient request', async () => {
      await editRequestUrl(page, firstCollection, 'req-one', 'https://example.com/one-shortcut');
      await editRequestUrl(page, secondCollection, 'req-two', 'https://example.com/two-shortcut');
      await createTransientRequest(page);
      await fillRequestUrl(page, 'https://example.com/transient-draft', { replace: true });
      await expect(buildCommonLocators(page).tabs.draftIndicator()).toBeVisible();
    });

    await test.step('Press the workspace save-all shortcut', async () => {
      await page.keyboard.press(`${modifier}+Alt+KeyS`);
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
    });

    await test.step('Saved requests are on disk; the transient request is not yet', async () => {
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('https://example.com/one-shortcut');
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('https://example.com/two-shortcut');
      expect(readAllFiles(collectionsDir)).not.toContain('https://example.com/transient-draft');
    });

    await test.step('The save dialog opens for the transient request and saves it', async () => {
      await saveTransientViaModal(page, 'transient-saved', { collectionName: secondCollection });
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('https://example.com/transient-draft');
    });
  });

  test('menu item is enabled for an edited scratch request and asks where to save it', async ({ page }) => {
    await test.step('Edit a scratch request on the workspace overview', async () => {
      await page.locator('.home-button').click();
      await createTransientRequest(page);
      await fillRequestUrl(page, 'https://example.com/scratch-draft', { replace: true });
      await expect(buildCommonLocators(page).tabs.draftIndicator()).toBeVisible();
    });

    await test.step('Save all from the Collections menu', async () => {
      await openCollectionsMenu(page);
      await expect(saveAllMenuItem(page)).not.toHaveAttribute('aria-disabled', 'true');
      await saveAllMenuItem(page).click();
    });

    await test.step('The save dialog opens for the scratch request and saves it', async () => {
      await saveTransientViaModal(page, 'scratch-saved', { collectionName: firstCollection });
      await expect.poll(() => readAllFiles(collectionsDir)).toContain('https://example.com/scratch-draft');
    });
  });
});
