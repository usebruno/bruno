import { test, expect, closeElectronApp, Page } from '../../../playwright';
import path from 'path';
import { buildCommonLocators, openRequest, waitForReadyPage } from '../../utils/page';
import { initBruCollection, writeBruRequest } from '../../utils/fixtures/bru-collection';

const COLLECTION_NAME = 'TabStripCol';
const REQUEST_COUNT = 10;
const reqName = (index: number) => `req-${String(index).padStart(3, '0')}`;

const buildCollectionOnDisk = (dir: string) => {
  initBruCollection(dir, COLLECTION_NAME);
  for (let index = 1; index <= REQUEST_COUNT; index += 1) {
    writeBruRequest(dir, reqName(index), { seq: index });
  }
};

const activeTabIsInStrip = async (page: Page) => {
  const locators = buildCommonLocators(page);
  const strip = await locators.tabs.scrollContainer().boundingBox();
  const tab = await locators.tabs.activeRequestTab().boundingBox();
  if (!strip || !tab) return false;

  return tab.x >= strip.x - 1 && tab.x + tab.width <= strip.x + strip.width + 1;
};

test.describe('Request tab strip scroll-to-active', () => {
  test.setTimeout(120000);

  test('activating an offscreen request tab scrolls the strip to it', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const collectionDir = path.join(await createTmpDir('tab-strip-scroll'), COLLECTION_NAME);
    buildCollectionOnDisk(collectionDir);

    const app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data'),
      templateVars: { collectionPath: collectionDir.split(path.sep).join('/') }
    });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);

    try {
      await test.step('App loads with the collection populated', async () => {
        await locators.sidebar.collection(COLLECTION_NAME).click();
        await expect(locators.sidebar.request(reqName(1))).toBeVisible({ timeout: 15000 });
      });

      await test.step('Open every request as a persistent tab', async () => {
        for (let index = 1; index <= REQUEST_COUNT; index += 1) {
          await openRequest(page, COLLECTION_NAME, reqName(index), { persist: true });
        }
        await expect(locators.tabs.leftChevron()).toBeVisible();
      });

      await test.step('The request opened last is in view', async () => {
        await expect(locators.tabs.activeRequestTab()).toContainText(reqName(REQUEST_COUNT));
        await expect.poll(() => activeTabIsInStrip(page)).toBe(true);
      });

      await test.step('Activating the first request scrolls its tab back into view', async () => {
        await locators.sidebar.request(reqName(1)).click();

        await expect(locators.tabs.activeRequestTab()).toContainText(reqName(1));
        await expect.poll(() => activeTabIsInStrip(page)).toBe(true);
      });

      await test.step('And activating the last one scrolls forward again', async () => {
        await locators.sidebar.request(reqName(REQUEST_COUNT)).click();

        await expect(locators.tabs.activeRequestTab()).toContainText(reqName(REQUEST_COUNT));
        await expect.poll(() => activeTabIsInStrip(page)).toBe(true);
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
