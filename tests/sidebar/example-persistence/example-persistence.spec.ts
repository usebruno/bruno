import { test, expect, closeElectronApp, type Page, type Locator } from '../../../playwright';
import path from 'path';
import { buildCommonLocators } from '../../utils/page';
import { initBruCollection, writeBruRequest } from '../../utils/fixtures/bru-collection';

const COLLECTION_NAME = 'ExampleCol';
const FILLER_COUNT = 45; // enough for the tree to overflow the sidebar viewport
const reqName = (i: number) => `req-${String(i).padStart(3, '0')}`;
// req-ex occupies seq 1, so the fillers run 2..FILLER_COUNT + 1.
const LAST_SEQ = FILLER_COUNT + 1;
const LAST_REQUEST = reqName(LAST_SEQ);

const WHEEL_TIMEOUT = 15000;
const WHEEL_INTERVAL = 60;

const buildCollectionOnDisk = (dir: string) => {
  initBruCollection(dir, COLLECTION_NAME);
  writeBruRequest(dir, 'req-ex', { seq: 1, examples: ['ex-one', 'ex-two'] });
  for (let i = 2; i <= LAST_SEQ; i++) {
    writeBruRequest(dir, reqName(i), { seq: i });
  }
};

// Wheel the sidebar until `target` is within the viewport.
const wheelUntilInViewport = async (page: Page, hover: Locator, target: Locator, dy: number) => {
  await hover.hover();
  await target.waitFor({ state: 'attached' });
  await expect(async () => {
    await page.mouse.wheel(0, dy);
    await expect(target).toBeInViewport({ timeout: WHEEL_INTERVAL });
  }).toPass({ timeout: WHEEL_TIMEOUT, intervals: [WHEEL_INTERVAL] });
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

      await test.step('Scroll to the last item so that the request (and its examples) out of view', async () => {
        await wheelUntilInViewport(page, sidebar, locators.sidebar.request(LAST_REQUEST), 400);
        await expect(locators.sidebar.request('req-ex')).not.toBeInViewport();
      });

      await test.step('Scroll back up, examples are still expanded', async () => {
        await wheelUntilInViewport(page, sidebar, locators.sidebar.request('req-ex'), -400);
        await expect(locators.sidebar.example('ex-one')).toBeVisible();
        await expect(locators.sidebar.example('ex-two')).toBeVisible();
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
