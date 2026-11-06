import { test, expect, closeElectronApp } from '../../../../playwright';
import path from 'path';
import { clearSearchIndex, waitForReadyPage } from '../../../utils/page';
import { buildSidebarLocators } from '../../../utils/page/sidebar';
import { buildCommonLocators } from '../../../utils/page/locators';
import { buildCollectionTreeLocators } from '../../../utils/page/mounting';
import { initBruCollection, writeBruRequest } from '../../../utils/fixtures/bru-collection';
import { CACHE_MODES, writePreferences } from '../helpers';

type RowSample = { at: number; rowCount: number; hasItem: boolean; collection: string };

/**
 * Polls the rows React hands to the sidebar's Virtuoso list, read off the scroller's fiber, along
 * with the collection's mount state from the Redux store. Unlike screenshots, this sees a committed
 * render even if no frame was painted from it. Only changes are kept; rowCount is -1 when the list
 * isn't mounted at all.
 */
const startRowPoller = (scroller, itemName: string, collectionName: string) => scroller.evaluate((el, { name, collectionName }) => {
  const testId = el.getAttribute('data-testid');
  const readFibers = () => {
    const found = { rows: null, store: null };
    const node = document.querySelector(`[data-testid="${testId}"]`);
    if (!node) return found;
    const fiberKey = Object.keys(node).find((key) => key.startsWith('__reactFiber$'));
    for (let fiber = node[fiberKey]; fiber && !found.store; fiber = fiber.return) {
      const props = fiber.memoizedProps;
      if (!found.rows && Array.isArray(props?.data) && props.itemContent) found.rows = props.data;
      if (props?.store?.getState) found.store = props.store;
    }
    return found;
  };
  const countItems = (items = []) => items.reduce((count, item) => count + 1 + countItems(item.items), 0);
  const describeCollection = (store) => {
    const collection = store?.getState().collections.collections.find((c) => c.name === collectionName);
    if (!collection) return 'none';
    return `${collection.mountStatus} loading=${Boolean(collection.isLoading)} items=${countItems(collection.items)}`;
  };

  const samples: RowSample[] = [];
  const start = performance.now();
  let last = '';
  // Chromium clamps repeating timers to ~4ms, so this samples every 4ms rather than every 2ms
  const timer = setInterval(() => {
    const { rows, store } = readFibers();
    const sample = {
      at: Math.round(performance.now() - start),
      rowCount: rows ? rows.length : -1,
      hasItem: Boolean(rows?.some((row) => row.kind === 'request' && row.sortName === name)),
      collection: describeCollection(store)
    };
    const signature = `${sample.rowCount}:${sample.hasItem}:${sample.collection}`;
    if (signature !== last) samples.push(sample);
    last = signature;
  }, 2);
  (window as any).__stopRowPoller = () => {
    clearInterval(timer);
    return samples;
  };
}, { name: itemName, collectionName });

const stopRowPoller = (page): Promise<RowSample[]> => page.evaluate(() => (window as any).__stopRowPoller());

const SIZES = [
  { label: 'small', requestCount: 3 },
  { label: 'large', requestCount: 200 }
];

for (const cacheMode of CACHE_MODES) {
  for (const size of SIZES) {
    test(`[${cacheMode.label}] [${size.label}] sidebar never blanks while mounting from a search result`, async ({ launchElectronApp, createTmpDir }, testInfo) => {
      test.setTimeout(120_000);
      const tag = `${cacheMode.enabled ? 'on' : 'off'}-${size.label}`;
      const root = await createTmpDir(`search-continuity-${tag}`);
      const collection = path.join(root, 'ContinuityA');
      initBruCollection(collection, 'ContinuityA');
      writeBruRequest(collection, 'continuity-hit', { seq: 1, url: 'https://continuity.example/hit' });
      for (let i = 2; i <= size.requestCount; i += 1) {
        writeBruRequest(collection, `filler-${i}`, { seq: i, url: `https://filler.example/${i}` });
      }

      const userDataPath = await createTmpDir(`search-continuity-userdata-${tag}`);
      writePreferences(userDataPath, [collection], cacheMode.enabled);

      const app = await launchElectronApp({ userDataPath });
      const page = await waitForReadyPage(app);
      await clearSearchIndex(page);
      const sidebar = buildSidebarLocators(page);
      const scroller = sidebar.collectionsScroller();
      const tree = buildCollectionTreeLocators(page);

      try {
        await sidebar.searchToggle().click();
        const searchInput = sidebar.searchInput();

        await searchInput.fill('continuity-hit');
        await expect(sidebar.itemRow('continuity-hit')).toBeVisible({ timeout: 30_000 });

        await startRowPoller(scroller, 'continuity-hit', 'ContinuityA');
        await sidebar.itemRow('continuity-hit').click();
        await expect(buildCommonLocators(page).tabs.activeRequestTab().filter({ hasText: 'continuity-hit' })).toBeVisible();
        await expect(tree.collection.loadingSpinner('ContinuityA')).toHaveCount(0, { timeout: 30_000 });
        await expect(sidebar.itemRow('continuity-hit')).toBeVisible();
        const rowSamples = await stopRowPoller(page);
        await testInfo.attach('row-samples', { body: JSON.stringify(rowSamples, null, 2), contentType: 'application/json' });

        const missing = rowSamples.filter((sample) => !sample.hasItem);
        expect(missing, `rows lost 'continuity-hit' after the click: ${JSON.stringify(rowSamples)}`).toEqual([]);
      } finally {
        await closeElectronApp(app);
      }
    });
  }
}
