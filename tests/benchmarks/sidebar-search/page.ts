import { expect, type ElectronApplication, type Page } from '@playwright/test';
import { buildCommonLocators } from '../../utils/page';

const POLL_MS = 25;
const INDEXING_TIMEOUT_MS = 40 * 60_000;
const MOUNT_TIMEOUT_MS = 10 * 60_000;
const FIRST_RESULT_TIMEOUT_MS = 10 * 60_000;
const PERSISTED_COLLECTIONS_TIMEOUT_MS = 5_000;
const IMPORTED_COLLECTIONS_TIMEOUT_MS = 5 * 60_000;
const SCAN_TIMEOUT_MS = 5 * 60_000;
const UI_ACTION_TIMEOUT_MS = 60_000;
export const buildSidebarSearchLocators = (page: Page) => ({
  openSearch: page.getByTitle('Search requests'),
  input: page.getByTestId('sidebar-search-input'),
  firstCollection: page.locator('#sidebar-collection-name').first()
});

const listedCollectionCount = (page: Page) => page.locator('#sidebar-collection-name').count();

const waitForListedCollections = (page: Page, expected: number, timeout: number) => page
  .waitForFunction((count) => document.querySelectorAll('#sidebar-collection-name').length >= count, expected, { timeout, polling: 250 })
  .then(() => true, () => false);

export const importCollections = async (app: ElectronApplication, page: Page, collectionSetDir: string, expectedCount: number) => {
  if (await waitForListedCollections(page, expectedCount, PERSISTED_COLLECTIONS_TIMEOUT_MS)) return 0;

  const locators = buildCommonLocators(page);
  await app.evaluate(({ dialog }, { dir }) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] });
  }, { dir: collectionSetDir });

  await locators.plusMenu.button().click({ timeout: UI_ACTION_TIMEOUT_MS });
  await locators.plusMenu.openCollection().click({ timeout: UI_ACTION_TIMEOUT_MS });

  const modal = locators.modal.byTitle('Open Collection');
  await modal.waitFor({ state: 'visible', timeout: SCAN_TIMEOUT_MS });
  await expect(locators.openCollectionPicker.count()).not.toHaveText('0', { timeout: SCAN_TIMEOUT_MS });
  const found = Number(await locators.openCollectionPicker.count().textContent());

  await locators.openCollectionPicker.selectAllToggle().click({ timeout: UI_ACTION_TIMEOUT_MS });
  await expect(locators.modal.footer()).toContainText(`${found} of ${found} selected`, { timeout: UI_ACTION_TIMEOUT_MS });
  await locators.modal.button('Open').click({ timeout: UI_ACTION_TIMEOUT_MS });

  if (!(await waitForListedCollections(page, expectedCount, IMPORTED_COLLECTIONS_TIMEOUT_MS))) {
    throw new Error(`Expected ${expectedCount} collections in the sidebar after Select All and Open but found ${await listedCollectionCount(page)}`);
  }
  return found;
};

export const installProbes = async (page: Page) => {
  await page.evaluate(() => {
    const bench: any = { indexing: [], loader: [], mountDoneAt: null };
    (window as any).__bench = bench;
    (window as any).ipcRenderer.on('main:search-index-status', (status: any) => {
      bench.indexing.push({
        t: Date.now(),
        isIndexing: !!(status && status.isIndexing),
        completed: status?.completed ?? 0,
        total: status?.total ?? 0
      });
    });
    let loaderVisible = false;
    const checkLoader = () => {
      const visible = Boolean(document.querySelector('[data-testid="sidebar-progress"][role="progressbar"]'));
      if (visible !== loaderVisible) {
        loaderVisible = visible;
        bench.loader.push({ t: Date.now(), visible });
      }
    };
    new MutationObserver(checkLoader).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['role'] });
  });
};

export const waitForIndexingIdle = async (page: Page, { quietPolls = 3, quietPollsWhenNeverIndexing = 6, timeoutMs = INDEXING_TIMEOUT_MS } = {}) => {
  const started = Date.now();
  let quiet = 0;
  while (Date.now() - started < timeoutMs) {
    const status = await page.evaluate(() => (window as any).ipcRenderer.invoke('renderer:get-search-index-status')).catch(() => ({ isIndexing: true }));
    const seen = await page.evaluate(() => (window as any).__bench.indexing.some((e: any) => e.isIndexing)).catch(() => false);
    const indexing = status.isIndexing || status.isDiscovering || (status.total > 0 && status.completed < status.total);
    quiet = indexing ? 0 : quiet + 1;
    if (quiet >= (seen ? quietPolls : quietPollsWhenNeverIndexing)) return;
    await page.waitForTimeout(1000);
  }
  throw new Error(`The search index was still indexing after ${Math.round(timeoutMs / 60_000)} minutes`);
};

export const mountFirstCollection = async (page: Page) => {
  const { firstCollection } = buildSidebarSearchLocators(page);
  await page.evaluate(() => {
    const bench = (window as any).__bench;
    bench.mountDoneAt = null;
    const off = (window as any).ipcRenderer.on('main:collection-loading-state-updated', (state: any) => {
      if (!state.isLoading) {
        off();
        bench.mountDoneAt = Date.now();
      }
    });
  });

  const started = Date.now();
  await firstCollection.click({ timeout: MOUNT_TIMEOUT_MS });
  await page.waitForFunction(() => (window as any).__bench.mountDoneAt !== null, null, { timeout: MOUNT_TIMEOUT_MS, polling: 250 });
  const mountDoneAt = await page.evaluate(() => (window as any).__bench.mountDoneAt as number);
  await page.waitForTimeout(3000);
  await waitForIndexingIdle(page, { quietPolls: 2, quietPollsWhenNeverIndexing: 2, timeoutMs: MOUNT_TIMEOUT_MS });
  return mountDoneAt - started;
};

const waitForFirstSearchHit = async (page: Page, term: string) => {
  const needle = term.toLowerCase();
  await page.waitForFunction((searchTerm) => {
    const rows = document.querySelectorAll('[data-testid="sidebar-collection-item-row"]');
    if (!rows.length) return false;
    const lower = String(searchTerm).toLowerCase();
    return [...rows].some((row) => row.textContent?.toLowerCase().includes(lower));
  }, needle, { timeout: FIRST_RESULT_TIMEOUT_MS, polling: POLL_MS });
};

export const searchFor = async (page: Page, term: string) => {
  const { openSearch, input } = buildSidebarSearchLocators(page);
  await openSearch.click({ timeout: UI_ACTION_TIMEOUT_MS });

  const startedAt = Date.now();
  await input.fill(term, { timeout: UI_ACTION_TIMEOUT_MS });
  await waitForFirstSearchHit(page, term);
  const firstResultMs = Date.now() - startedAt;
  const labelShownAt = Date.now();

  await waitForIndexingIdle(page);

  const { indexing, loader } = await page.evaluate(() => {
    const bench = (window as any).__bench;
    return { indexing: bench.indexing as { t: number; isIndexing: boolean }[], loader: bench.loader as { t: number; visible: boolean }[] };
  });
  const lastHidden = [...loader].reverse().find((e) => !e.visible && e.t >= startedAt);
  const settledMs = Math.max(lastHidden ? lastHidden.t : 0, labelShownAt) - startedAt;
  const firstIndexingStart = indexing.find((e) => e.isIndexing);
  const lastIndexingEnd = [...indexing].reverse().find((e) => !e.isIndexing);
  const indexingMs = firstIndexingStart && lastIndexingEnd ? lastIndexingEnd.t - firstIndexingStart.t : null;

  return { firstResultMs, settledMs, indexingMs };
};
