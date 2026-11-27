import { test, expect, closeElectronApp } from '../../../../playwright';
import path from 'path';
import {
  clearSearchIndex
} from '../../../../pages';
import {
  waitForReadyPage
} from '../../../../utils';
import { buildSidebarLocators } from '../../../../pages/sidebar/collection-tree';
import { buildPressureCollection, parseMatchCount, writePreferences } from '../helpers';

const REQUEST_COUNT = 1500;
const SEARCH_RESULT_TIMEOUT_MS = 30_000;
const INDEXING_TIMEOUT_MS = 180_000;
const SCROLL_TIMEOUT_MS = 120_000;

test('shows match count vs visible rows while indexing, then scrolls to later unmounted hits', async ({ launchElectronApp, createTmpDir }) => {
  test.setTimeout(240_000);
  const root = await createTmpDir('search-unmounted-window');
  const collection = buildPressureCollection(path.join(root, 'ScrollHits'), 'ScrollHits', {
    name: 'needle-unused',
    url: 'https://needle-unused.example/item'
  }, REQUEST_COUNT);

  const userDataPath = await createTmpDir('search-unmounted-window-userdata');
  writePreferences(userDataPath, [collection], true);

  const app = await launchElectronApp({ userDataPath });
  const page = await waitForReadyPage(app);
  await clearSearchIndex(page);
  const sidebar = buildSidebarLocators(page);
  const searchInput = sidebar.searchInput();
  const matchCount = sidebar.searchMatchCount();
  const indexingLoader = page.getByTestId('sidebar-search-indexing');
  const requestRows = page.getByTestId('sidebar-collection-item-row').filter({
    hasNot: page.getByTestId('folder-chevron')
  });
  const lastRequest = `request-${REQUEST_COUNT}`;

  try {
    await sidebar.searchToggle().click();

    await test.step('indexing spinner appears, then the badge is ahead of the on-screen request list', async () => {
      await searchInput.fill('resource/');
      await expect(indexingLoader).toBeVisible({ timeout: SEARCH_RESULT_TIMEOUT_MS });
      await expect.poll(async () => {
        const counted = parseMatchCount(await matchCount.textContent());
        const visibleRequests = await requestRows.count();
        return counted > 0 && visibleRequests > 0 && visibleRequests <= counted;
      }, { timeout: INDEXING_TIMEOUT_MS }).toBe(true);
    });

    await test.step('after indexing, the badge is 1500 matches and the last hit is not on screen', async () => {
      await expect(indexingLoader).toBeHidden({ timeout: INDEXING_TIMEOUT_MS });
      await expect(matchCount).toHaveText('1500 matches', { timeout: SEARCH_RESULT_TIMEOUT_MS });
      await expect.poll(() => requestRows.count()).toBeLessThan(REQUEST_COUNT);
      await expect(sidebar.itemByName(lastRequest)).toHaveCount(0);
    });

    await test.step('scrolling the sidebar loads later unmounted hits', async () => {
      await expect.poll(async () => {
        await sidebar.collectionsScroller().evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        return sidebar.itemByName(lastRequest).isVisible();
      }, { timeout: SCROLL_TIMEOUT_MS }).toBe(true);
      await expect(matchCount).toHaveText('1500 matches');
    });
  } finally {
    await closeElectronApp(app);
  }
});
