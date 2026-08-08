import { test, expect, closeElectronApp, type Page, type Locator } from '../../../playwright';
import path from 'path';
import { buildCommonLocators } from '../../utils/page';
import { initBruCollection, writeBruRequest } from '../../utils/fixtures/bru-collection';

const COLLECTION_NAME = 'ExampleCol';
const FILLER_COUNT = 45; // enough for the tree to overflow the sidebar viewport
const reqName = (i: number) => `req-${String(i).padStart(3, '0')}`;

const buildCollectionOnDisk = (dir: string) => {
  initBruCollection(dir, COLLECTION_NAME);
  // The request-with-examples sits at the top. fillers below make the top scrollable out of view.
  writeBruRequest(dir, 'req-ex', { seq: 1, examples: ['ex-one', 'ex-two'] });
  for (let i = 2; i <= FILLER_COUNT + 1; i++) writeBruRequest(dir, reqName(i), { seq: i });
};

// Wheel the sidebar until `target` is within the viewport (dy < 0 scrolls up, > 0 down).
const wheelUntilInViewport = async (page: Page, hover: Locator, target: Locator, dy: number) => {
  await hover.hover();
  for (let i = 0; i < 50; i++) {
    try {
      await expect(target).toBeInViewport({ timeout: 150 });
      return;
    } catch {
      await page.mouse.wheel(0, dy);
      await page.waitForTimeout(60);
    }
  }
  await expect(target).toBeInViewport();
};

test.describe('Sidebar response-example persistence', () => {
  test('expanded examples stay expanded after scrolling the request out of view and back', async ({ launchElectronApp, createTmpDir }) => {
    const collectionDir = path.join(await createTmpDir('example-persistence'), COLLECTION_NAME);
    buildCollectionOnDisk(collectionDir);

    const app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data'),
      templateVars: { collectionPath: collectionDir.split(path.sep).join('/') }
    });
    const page = await app.firstWindow();
    const locators = buildCommonLocators(page);
    const sidebar = locators.sidebar.sidebarContainer();

    try {
      await test.step('Load the collection', async () => {
        await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
        await locators.sidebar.collection(COLLECTION_NAME).click();
        await expect(locators.sidebar.request('req-ex')).toBeVisible({ timeout: 15000 });
      });

      await test.step('Expand the request examples', async () => {
        await locators.sidebar.requestExamplesToggle('req-ex').click();
        await expect(locators.sidebar.example('ex-one')).toBeVisible();
        await expect(locators.sidebar.example('ex-two')).toBeVisible();
      });

      await test.step('Scroll the request (and its examples) out of view', async () => {
        await wheelUntilInViewport(page, sidebar, locators.sidebar.request(reqName(FILLER_COUNT + 1)), 400);
      });

      await test.step('Scroll back up — examples are still expanded', async () => {
        await wheelUntilInViewport(page, sidebar, locators.sidebar.request('req-ex'), -400);
        await expect(locators.sidebar.example('ex-one')).toBeVisible();
        await expect(locators.sidebar.example('ex-two')).toBeVisible();
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
