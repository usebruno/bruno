import { test, expect, closeElectronApp } from '../../../playwright';
import path from 'path';
import { waitForReadyPage } from '../../utils/page';
import { initBruCollection, writeBruRequest } from '../../utils/fixtures/bru-collection';

const COLLECTION_NAMES = ['IndexColA', 'IndexColB', 'IndexColC'];
const SHARED_NEEDLE = 'needle';
const HELD_TERM = 'alpha';
const REPLACEMENT_TERM = 'beta';

const buildCollections = (rootDir: string) => {
  const paths: string[] = [];
  COLLECTION_NAMES.forEach((name, index) => {
    const dir = path.join(rootDir, name);
    initBruCollection(dir, name);
    writeBruRequest(dir, `${SHARED_NEEDLE}-${index + 1}`, { seq: 1 });
    writeBruRequest(dir, HELD_TERM, { seq: 2 });
    writeBruRequest(dir, REPLACEMENT_TERM, { seq: 3 });
    paths.push(dir);
  });
  return paths;
};

const installIndexStatusProbe = async (page: import('@playwright/test').Page) => {
  await page.evaluate(() => {
    (window as any).__indexStatusEvents = [];
    window.ipcRenderer.on('main:search-index-status', (status: { completed?: number; total?: number | null; isIndexing?: boolean; isDiscovering?: boolean }) => {
      (window as any).__indexStatusEvents.push({ ...status });
    });
  });
};

const installInvokeSpy = async (page: import('@playwright/test').Page) => {
  await page.evaluate(() => {
    const ipc = window.ipcRenderer;
    const original = ipc.invoke;
    let releaseHeld: (() => void) | null = null;
    const state = {
      indexCollectionsCalls: 0,
      releaseHeld: () => {
        releaseHeld?.();
        releaseHeld = null;
      },
      restore: () => {
        ipc.invoke = original;
      }
    };
    ipc.invoke = function patchedInvoke(channel: string, ...args: unknown[]) {
      if (channel === 'renderer:index-collections') {
        state.indexCollectionsCalls += 1;
      }
      if (channel === 'renderer:search-index-trees' && args[0] === 'alpha') {
        return new Promise((resolve) => {
          releaseHeld = () => {
            original.call(ipc, channel, ...args).then(resolve);
          };
        });
      }
      return original.call(ipc, channel, ...args);
    };
    (window as any).__searchIndexProgressTest = state;
  });
};

const openSidebarSearch = async (page: import('@playwright/test').Page) => {
  await page.getByTitle('Search requests').click();
  return page.getByTestId('sidebar-search-input');
};

test.describe('Sidebar search index progress', () => {
  test('reports monotonic collection progress while indexing', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(120_000);
    const rootDir = await createTmpDir('search-index-progress');
    const collectionPaths = buildCollections(rootDir);

    const app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data'),
      templateVars: {
        collectionPath1: collectionPaths[0],
        collectionPath2: collectionPaths[1],
        collectionPath3: collectionPaths[2]
      }
    });
    const page = await waitForReadyPage(app);
    await installIndexStatusProbe(page);
    const searchInput = await openSidebarSearch(page);
    const status = page.getByTestId('sidebar-indexing-status');
    const progress = page.getByTestId('sidebar-progress');

    try {
      await searchInput.fill(SHARED_NEEDLE);

      const deadline = Date.now() + 90_000;
      const completedCounts: number[] = [];
      while (Date.now() < deadline) {
        const events = await page.evaluate(() => (window as any).__indexStatusEvents as { completed?: number; total?: number; isIndexing?: boolean }[]);
        for (const event of events) {
          if (event.total === COLLECTION_NAMES.length && typeof event.completed === 'number') {
            if (!completedCounts.length || event.completed >= completedCounts[completedCounts.length - 1]) {
              completedCounts.push(event.completed);
            }
          }
        }
        const idle = await page.evaluate(() => window.ipcRenderer.invoke('renderer:get-search-index-status'));
        if (!idle.isIndexing && idle.total === COLLECTION_NAMES.length && idle.completed >= idle.total) {
          break;
        }
        await page.waitForTimeout(50);
      }

      expect(completedCounts.length).toBeGreaterThan(1);
      expect(completedCounts[completedCounts.length - 1]).toBe(COLLECTION_NAMES.length);

      if (await status.isVisible().catch(() => false)) {
        await expect(status).toContainText(`of ${COLLECTION_NAMES.length}`);
      }
      if (await progress.isVisible().catch(() => false)) {
        const aria = await progress.getAttribute('aria-valuenow');
        expect(aria).not.toBeNull();
      }

      await expect(status).toHaveCount(0, { timeout: 15_000 });
      await expect(progress).toHaveCount(0, { timeout: 15_000 });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('replaces stale search results without restarting workspace indexing', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(120_000);
    const rootDir = await createTmpDir('search-index-stale');
    const collectionPaths = buildCollections(rootDir);

    const app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data'),
      templateVars: {
        collectionPath1: collectionPaths[0],
        collectionPath2: collectionPaths[1],
        collectionPath3: collectionPaths[2]
      }
    });
    const page = await waitForReadyPage(app);
    await installIndexStatusProbe(page);
    await installInvokeSpy(page);

    try {
      const searchInput = await openSidebarSearch(page);
      await searchInput.fill(HELD_TERM);
      await page.waitForTimeout(400);
      await searchInput.fill(REPLACEMENT_TERM);

      await page.waitForFunction((term) => {
        const rows = document.querySelectorAll('[data-testid="sidebar-collection-item-row"]');
        const lower = String(term).toLowerCase();
        return [...rows].some((row) => row.textContent?.toLowerCase().includes(lower));
      }, REPLACEMENT_TERM, { timeout: 60_000 });

      await page.evaluate(() => (window as any).__searchIndexProgressTest.releaseHeld());

      await page.waitForTimeout(500);

      const rowTexts = await page.locator('[data-testid="sidebar-collection-item-row"]').allTextContents();
      const hasBeta = rowTexts.some((text) => text.toLowerCase().includes(REPLACEMENT_TERM));
      const hasAlphaOnly = rowTexts.some((text) => text.toLowerCase().includes(HELD_TERM) && !text.toLowerCase().includes(REPLACEMENT_TERM));
      expect(hasBeta).toBe(true);
      expect(hasAlphaOnly).toBe(false);

      await page.evaluate(() => (window as any).__searchIndexProgressTest.restore());
    } finally {
      await closeElectronApp(app);
    }
  });

  test('indexes only collections that match the search term', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(120_000);
    const rootDir = await createTmpDir('search-index-candidates');
    const matchName = 'MatchOnlyCol';
    const otherName = 'OtherCol';
    const uniqueNeedle = 'uniqCandIdx42';

    const matchDir = path.join(rootDir, matchName);
    const otherDir = path.join(rootDir, otherName);
    initBruCollection(matchDir, matchName);
    initBruCollection(otherDir, otherName);
    writeBruRequest(matchDir, uniqueNeedle, { seq: 1 });
    writeBruRequest(otherDir, 'plain-request', { seq: 1 });

    const app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data'),
      templateVars: {
        collectionPath1: matchDir,
        collectionPath2: otherDir,
        collectionPath3: otherDir
      }
    });
    const page = await waitForReadyPage(app);
    await installIndexStatusProbe(page);

    try {
      const searchInput = await openSidebarSearch(page);
      await searchInput.fill(uniqueNeedle);

      await page.waitForFunction((term) => {
        const rows = document.querySelectorAll('[data-testid="sidebar-collection-item-row"]');
        const lower = String(term).toLowerCase();
        return [...rows].some((row) => row.textContent?.toLowerCase().includes(lower));
      }, uniqueNeedle, { timeout: 90_000 });

      const rowTexts = await page.locator('[data-testid="sidebar-collection-item-row"]').allTextContents();
      const lowerNeedle = uniqueNeedle.toLowerCase();
      expect(rowTexts.filter((text) => text.toLowerCase().includes(lowerNeedle))).toHaveLength(1);
      expect(rowTexts.some((text) => text.toLowerCase().includes('plain-request'))).toBe(false);

      const peakTotal = await page.evaluate(() => {
        const events = (window as any).__indexStatusEvents as { total?: number | null }[];
        const totals = events.map((event) => event.total).filter((total): total is number => typeof total === 'number' && total > 0);
        return totals.length ? Math.max(...totals) : 0;
      });
      expect(peakTotal).toBe(1);
    } finally {
      await closeElectronApp(app);
    }
  });

  test('does not restart indexing while the search term stays unchanged', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(120_000);
    const rootDir = await createTmpDir('search-index-idle');
    const collectionPaths = buildCollections(rootDir);

    const app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data'),
      templateVars: {
        collectionPath1: collectionPaths[0],
        collectionPath2: collectionPaths[1],
        collectionPath3: collectionPaths[2]
      }
    });
    const page = await waitForReadyPage(app);
    await installIndexStatusProbe(page);

    try {
      const searchInput = await openSidebarSearch(page);
      await searchInput.fill(SHARED_NEEDLE);
      await page.waitForTimeout(1_000);

      const expectedCollections = COLLECTION_NAMES.length;
      await page.waitForFunction(async (expected) => {
        const idle = await window.ipcRenderer.invoke('renderer:get-search-index-status');
        return !idle.isIndexing && idle.total === expected && idle.completed >= idle.total;
      }, expectedCollections, { timeout: 90_000 });

      await page.waitForTimeout(1_500);

      for (let i = 0; i < 30; i += 1) {
        await page.waitForTimeout(100);
        const idle = await page.evaluate(() => window.ipcRenderer.invoke('renderer:get-search-index-status'));
        expect(idle.isIndexing).toBe(false);
        expect(idle.isDiscovering).toBe(false);
      }
    } finally {
      await closeElectronApp(app);
    }
  });
});
