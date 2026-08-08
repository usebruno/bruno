import { test, expect, closeElectronApp, type Locator } from '../../../playwright';
import path from 'path';
import { buildCommonLocators } from '../../utils/page';
import { initBruCollection, writeBruRequest } from '../../utils/fixtures/bru-collection';

const COLLECTION_NAME = 'ScrollKeepCol';
const REQUEST_COUNT = 50;
const reqName = (i: number) => `req-${String(i).padStart(3, '0')}`;

const buildCollectionOnDisk = (dir: string) => {
  initBruCollection(dir, COLLECTION_NAME);
  for (let i = 1; i <= REQUEST_COUNT; i++) writeBruRequest(dir, reqName(i), { seq: i });
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
    const row = (name: string) => page.locator('.collection-item-name').filter({ hasText: name });

    // A reference row NOT touched by the edit — its viewport position reflects the scroll offset.
    const reference = row('req-028');

    try {
      await test.step('Load and scroll down into the middle of the list', async () => {
        await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
        await locators.sidebar.collection(COLLECTION_NAME).click();
        await expect(row(reqName(1))).toBeVisible({ timeout: 15000 });
        // Scroll req-030 into view (Playwright auto-scrolls on hover); req-028 sits just above it.
        await row('req-030').hover();
        await expect(reference).toBeVisible();
      });

      const before = await topOf(reference);

      await test.step('Rename req-030 (a content edit that re-renders the sidebar)', async () => {
        await row('req-030').hover();
        await locators.actions.collectionItemActions('req-030').click();
        await locators.dropdown.item('Rename').click();

        const modal = page.locator('.bruno-modal').filter({ hasText: 'Rename Request' });
        await modal.waitFor({ state: 'visible' });
        await modal.locator('#collection-item-name').fill('renamed-req');
        await modal.getByTestId('rename-item-button').click();
        await modal.waitFor({ state: 'hidden' });

        await expect(row('renamed-req')).toBeVisible({ timeout: 10000 });
      });

      await test.step('The sidebar has not jumped — the reference row is still where it was', async () => {
        await expect(reference).toBeVisible();
        const after = await topOf(reference);
        expect(Math.abs(after - before)).toBeLessThan(5);
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
