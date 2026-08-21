import { test, expect, closeElectronApp, type Locator } from '../../../playwright';
import path from 'path';
import { buildCommonLocators, renameCollectionItem } from '../../utils/page';
import { initBruCollection, writeBruRequest } from '../../utils/fixtures/bru-collection';

const COLLECTION_NAME = 'ScrollKeepCol';
const REQUEST_COUNT = 50;
const reqName = (i: number) => `req-${String(i).padStart(3, '0')}`;

const FIRST_REQUEST = reqName(1);
const TARGET_REQUEST = reqName(30);
const REFERENCE_REQUEST = reqName(28);
const RENAMED_REQUEST = 'renamed-req';
// Drift tolerated between the two measurements of the reference row's top edge.
const MAX_DRIFT_PX = 5;

const buildCollectionOnDisk = (dir: string) => {
  initBruCollection(dir, COLLECTION_NAME);
  for (let i = 1; i <= REQUEST_COUNT; i++) {
    writeBruRequest(dir, reqName(i), { seq: i });
  }
};

const topOf = async (loc: Locator) => {
  const box = await loc.boundingBox();
  if (!box) throw new Error('row has no bounding box (not visible)');
  return box.y;
};

test.describe('Sidebar scroll-position preservation', () => {
  test('editing a request does not reset the sidebar scroll position', async ({ launchElectronApp, createTmpDir }) => {
    const collectionDir = path.join(await createTmpDir('scroll-preservation'), COLLECTION_NAME);
    buildCollectionOnDisk(collectionDir);

    const app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data'),
      templateVars: { collectionPath: collectionDir.split(path.sep).join('/') }
    });
    const page = await app.firstWindow();
    const locators = buildCommonLocators(page);

    const firstRow = locators.sidebar.request(FIRST_REQUEST);
    const reference = locators.sidebar.request(REFERENCE_REQUEST);
    const target = locators.sidebar.request(TARGET_REQUEST);

    try {
      await test.step('Load and scroll down into the middle of the list', async () => {
        await expect(locators.appReady()).toBeVisible({ timeout: 30000 });
        await locators.sidebar.collection(COLLECTION_NAME).click();
        await expect(firstRow).toBeVisible({ timeout: 15000 });
        // Scroll the target into view (Playwright auto-scrolls on hover). the reference sits just above it.
        await target.hover();
        await expect(firstRow).not.toBeInViewport();
        await expect(reference).toBeVisible();
      });

      const before = await topOf(reference);

      await test.step('Rename the target request (a content edit that re-renders the sidebar)', async () => {
        await renameCollectionItem(page, TARGET_REQUEST, RENAMED_REQUEST);
        await expect(locators.sidebar.item(RENAMED_REQUEST)).toBeVisible();
        await expect(locators.sidebar.item(TARGET_REQUEST)).toHaveCount(0);
      });

      await test.step('The sidebar has not jumped — the reference row is still where it was', async () => {
        await expect(reference).toBeVisible();
        const after = await topOf(reference);
        expect(Math.abs(after - before)).toBeLessThan(MAX_DRIFT_PX);
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
