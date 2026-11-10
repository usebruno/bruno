import { test, expect, closeElectronApp } from '../../../playwright';
import path from 'path';
import { buildCommonLocators, expandFolder, openRequest, waitForReadyPage } from '../../utils/page';
import { initBruCollection, writeBruFolder, writeBruRequest } from '../../utils/fixtures/bru-collection';

const COLLECTION_NAME = 'RevealScrollCol';
const FILLER_COUNT = 60;
const fillerName = (i: number) => `filler-${String(i).padStart(3, '0')}`;

const WINDOW_SIZE = { width: 1200, height: 500 };

const buildCollectionOnDisk = (dir: string) => {
  initBruCollection(dir, COLLECTION_NAME);

  const folderA = writeBruFolder(dir, 'folder-a', 1);
  for (let i = 1; i <= FILLER_COUNT; i++) writeBruRequest(folderA, fillerName(i), { seq: i });

  const folderM = writeBruFolder(dir, 'folder-m', 2);
  writeBruRequest(folderM, 'deep-req', { seq: 1 });

  const folderZ = writeBruFolder(dir, 'folder-z', 3);
  for (let i = 1; i <= FILLER_COUNT; i++) writeBruRequest(folderZ, `tail-${String(i).padStart(3, '0')}`, { seq: i });
};

const launchWithCollection = async (launchElectronApp, createTmpDir, tag: string) => {
  const collectionDir = path.join(await createTmpDir(tag), COLLECTION_NAME);
  buildCollectionOnDisk(collectionDir);

  const app = await launchElectronApp({
    initUserDataPath: path.join(__dirname, 'init-user-data'),
    templateVars: { collectionPath: collectionDir.split(path.sep).join('/') }
  });
  const page = await waitForReadyPage(app);
  await page.setViewportSize(WINDOW_SIZE);

  return { app, page, locators: buildCommonLocators(page) };
};

test.describe('Sidebar reveal scrolls to the active row', () => {
  test('activating a tab far below the fold scrolls the sidebar to it', async ({ launchElectronApp, createTmpDir }) => {
    const { app, page, locators } = await launchWithCollection(launchElectronApp, createTmpDir, 'reveal-scroll');
    const row = locators.sidebar.item;

    try {
      await test.step('Expand both folders and open a request from each', async () => {
        await locators.sidebar.collectionChevron(COLLECTION_NAME).click();
        await expect(row('folder-a')).toBeVisible({ timeout: 15000 });

        await expandFolder(page, 'folder-z');
        await expandFolder(page, 'folder-m');
        await expect(row('deep-req')).toBeVisible();
        await openRequest(page, COLLECTION_NAME, 'deep-req', { persist: true });

        await expandFolder(page, 'folder-a');
        await expect(row(fillerName(1))).toBeVisible();
        await openRequest(page, COLLECTION_NAME, fillerName(1), { persist: true });
        await expect(locators.tabs.activeRequestTab()).toContainText(fillerName(1));
      });

      await test.step('Switching to the far-below tab scrolls the sidebar down to it', async () => {
        await expect(row('deep-req')).not.toBeInViewport();

        await locators.tabs.requestTab('deep-req').click();
        await expect(locators.tabs.activeRequestTab()).toContainText('deep-req');

        await expect(row('deep-req')).toBeInViewport();
      });

      await test.step('The revealed row settles near the middle, not flush against an edge', async () => {
        await expect.poll(async () => {
          const scroller = await locators.sidebar.collectionsScroller().boundingBox();
          const target = await row('deep-req').boundingBox();
          if (!scroller || !target) return null;
          const positionPercent = ((target.y + target.height / 2) - scroller.y) / scroller.height * 100;
          return positionPercent > 25 && positionPercent < 75;
        }, { timeout: 10000 }).toBe(true);
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('one click on the active tab scrolls after the collection is collapsed', async ({ launchElectronApp, createTmpDir }) => {
    const { app, page, locators } = await launchWithCollection(launchElectronApp, createTmpDir, 'reveal-collapsed');
    const row = locators.sidebar.item;
    const collectionChevron = locators.sidebar.collectionChevron(COLLECTION_NAME);

    try {
      await test.step('Open a deeply nested request, then collapse the whole collection', async () => {
        await collectionChevron.click();
        await expect(row('folder-a')).toBeVisible({ timeout: 15000 });

        await expandFolder(page, 'folder-z');
        await expandFolder(page, 'folder-m');
        await openRequest(page, COLLECTION_NAME, 'deep-req', { persist: true });
        await expect(locators.tabs.activeRequestTab()).toContainText('deep-req');

        await expandFolder(page, 'folder-a');

        await collectionChevron.click();
        await expect(row('deep-req')).toHaveCount(0);
      });

      await test.step('A single click on the active tab reveals AND scrolls to it', async () => {
        await locators.tabs.requestTab('deep-req').click();

        await expect(row('deep-req')).toBeVisible();
        await expect(row('deep-req')).toBeInViewport();
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('clicking a visible row in the sidebar does not move the list', async ({ launchElectronApp, createTmpDir }) => {
    const { app, page, locators } = await launchWithCollection(launchElectronApp, createTmpDir, 'reveal-no-jump');
    const row = locators.sidebar.item;
    const scrollTop = () => locators.sidebar.collectionsScroller().evaluate((el: HTMLElement) => el.scrollTop);

    try {
      await test.step('Expand a long folder so the list is scrollable', async () => {
        await locators.sidebar.collectionChevron(COLLECTION_NAME).click();
        await expect(row('folder-a')).toBeVisible({ timeout: 15000 });
        await expandFolder(page, 'folder-a');
        await expect(row(fillerName(1))).toBeVisible();
      });

      await test.step('Clicking rows that are already on screen leaves the scroll position alone', async () => {
        await locators.sidebar.collectionsScroller().evaluate((el: HTMLElement) => { el.scrollTop = 520; });
        await expect(row(fillerName(25))).toBeVisible();

        await row(fillerName(25)).dblclick();
        await expect(locators.tabs.activeRequestTab()).toContainText(fillerName(25));

        const before = await scrollTop();
        expect(before).toBeGreaterThan(100);

        await row(fillerName(28)).dblclick();
        await expect(locators.tabs.activeRequestTab()).toContainText(fillerName(28));

        await expect.poll(async () => Math.abs((await scrollTop()) - before), { timeout: 5000 }).toBeLessThan(5);
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
