import { test, expect, closeElectronApp } from '../../../playwright';
import path from 'path';
import { buildCommonLocators, openRequest, waitForReadyPage } from '../../utils/page';
import { initBruCollection, writeBruRequest } from '../../utils/fixtures/bru-collection';

// A collection large enough that its bottom rows start well below the sidebar viewport.
const COLLECTION_NAME = 'ScrollCol';
const REQUEST_COUNT = 60;
const reqName = (i: number) => `req-${String(i).padStart(3, '0')}`;

const WINDOW_SIZE = { width: 1200, height: 500 };

const buildCollectionOnDisk = (dir: string, count: number) => {
  initBruCollection(dir, COLLECTION_NAME);
  for (let i = 1; i <= count; i++) writeBruRequest(dir, reqName(i), { seq: i });
};

test.describe('Sidebar scroll-to-active-tab', () => {
  test('switching to a tab scrolls its offscreen sidebar row into view', async ({ launchElectronApp, createTmpDir }) => {
    const collectionDir = path.join(await createTmpDir('scroll-to-active'), COLLECTION_NAME);
    buildCollectionOnDisk(collectionDir, REQUEST_COUNT);

    // Open the app with the fully-built collection already registered as last-opened.
    const app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data'),
      templateVars: { collectionPath: collectionDir.split(path.sep).join('/') }
    });
    const page = await waitForReadyPage(app);
    await page.setViewportSize(WINDOW_SIZE);
    const locators = buildCommonLocators(page);
    const topRow = locators.sidebar.request(reqName(1));
    const bottomRow = locators.sidebar.request(reqName(REQUEST_COUNT));

    try {
      await test.step('App loads with the collection populated', async () => {
        await locators.sidebar.collection(COLLECTION_NAME).click();
        await expect(topRow).toBeVisible({ timeout: 15000 });
      });

      await test.step('Open a top and a bottom request as persistent tabs', async () => {
        await openRequest(page, COLLECTION_NAME, reqName(1), { persist: true });
        await openRequest(page, COLLECTION_NAME, reqName(REQUEST_COUNT), { persist: true });
        await expect(locators.tabs.activeRequestTab()).toContainText(reqName(REQUEST_COUNT));
      });

      await test.step('Activating the top tab scrolls the sidebar up to its row', async () => {
        await expect(topRow).not.toBeInViewport();

        await locators.tabs.requestTab(reqName(1)).click();
        await expect(locators.tabs.activeRequestTab()).toContainText(reqName(1));
        await expect(topRow).toBeInViewport();
      });

      await test.step('Activating the bottom tab scrolls the sidebar down to its row', async () => {
        await expect(bottomRow).not.toBeInViewport();

        await locators.tabs.requestTab(reqName(REQUEST_COUNT)).click();
        await expect(locators.tabs.activeRequestTab()).toContainText(reqName(REQUEST_COUNT));
        await expect(bottomRow).toBeInViewport();
      });

      await test.step('Closing the active bottom tab activates the top tab and scrolls to it', async () => {
        await expect(topRow).not.toBeInViewport();

        await locators.tabs.closeTab(reqName(REQUEST_COUNT)).click({ force: true });
        await expect(locators.tabs.activeRequestTab()).toContainText(reqName(1));
        await expect(topRow).toBeInViewport();
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
