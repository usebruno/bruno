import { test, expect, closeElectronApp, waitForReadyPage } from '../../../playwright';
import { version } from '../../../packages/bruno-app/package.json';
import {
  assertSearchTimingsAreRendered,
  ensureCollectionsListed,
  installProbes,
  mountFirstCollection,
  searchFor
} from './page';
import { buildReport, type ScenarioResult, type SizeResult } from './report';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SIZES_KB = (process.env.BENCH_SIZES || '5,25,50').split(',').map((s) => Number(s.trim())).filter((n) => n > 0);
const SEARCH_TERM = process.env.BENCH_TERM || 'sync';
const COLLECTIONS_ROOT = process.env.BENCH_COLLECTIONS_DIR || path.join(process.cwd(), 'collections');
const RESULTS_DIR = path.join(process.cwd(), 'tests', 'benchmarks', 'results');
const SNAPSHOT_FILE = 'ui-state-snapshot.json';

const SCENARIOS = [
  { name: 'S1 Cold + Cold, Not Mounted', mount: false },
  { name: 'S3 Cold + Warm, Not Mounted', mount: false },
  { name: 'S5 Warm + Warm, Not Mounted', mount: false },
  { name: 'S6 Cold + Warm, Mounted', mount: true },
  { name: 'S4 Warm + Warm, Mounted', mount: true }
];

const collectionDirsFor = (sizeKb: number) => {
  const setDir = path.join(COLLECTIONS_ROOT, `LC-10-${sizeKb}KB`);
  if (!fs.existsSync(setDir)) {
    throw new Error(`Collection set not found: ${setDir}. These sets are git-ignored; copy collections/LC-10-${sizeKb}KB from the machine that has them, or point BENCH_COLLECTIONS_DIR at them.`);
  }
  const dirs = fs.readdirSync(setDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => path.join(setDir, entry.name));
  if (!dirs.length) {
    throw new Error(`Collection set is empty: ${setDir}`);
  }
  return dirs;
};

const writePreferences = (userDataPath: string, collectionDirs: string[]) => {
  fs.writeFileSync(path.join(userDataPath, 'preferences.json'), JSON.stringify({
    preferences: {
      onboarding: { hasLaunchedBefore: true, hasSeenWelcomeModal: true, lastSeenVersion: version },
      ai: { enabled: false },
      cache: { file: { enabled: true }, searchIndex: { enabled: true } }
    },
    lastOpenedCollections: collectionDirs
  }, null, 2));
};

const writeReport = (results: SizeResult[]) => {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(RESULTS_DIR, 'sidebar-search.json'), JSON.stringify(results, null, 2));
  const report = buildReport(results);
  fs.writeFileSync(path.join(RESULTS_DIR, 'sidebar-search.md'), report);
  console.log(`\n[BENCHMARK] Sidebar search\n\n${report}\n[BENCHMARK] Results written to ${RESULTS_DIR}`);
};

test.describe('Benchmark: Sidebar Search', () => {
  test.describe.configure({ mode: 'serial' });

  const results: SizeResult[] = [];

  test.beforeAll(() => {
    assertSearchTimingsAreRendered();
  });

  for (const sizeKb of SIZES_KB) {
    test(`sidebar search on ${sizeKb}KB collections`, async ({ launchElectronApp, createTmpDir }) => {
      test.setTimeout(120 * 60_000);

      const collectionDirs = collectionDirsFor(sizeKb);
      const userDataPath = await createTmpDir(`sidebar-search-${sizeKb}KB`);
      writePreferences(userDataPath, collectionDirs);

      const sizeResult: SizeResult = { sizeKb, term: SEARCH_TERM, scenarios: [] };
      results.push(sizeResult);

      try {
        for (const scenario of SCENARIOS) {
          fs.rmSync(path.join(userDataPath, SNAPSHOT_FILE), { force: true });
          const measured: ScenarioResult = { scenario: scenario.name, firstResultMs: null, indexingMs: null, settledMs: null, mountMs: null };
          sizeResult.scenarios.push(measured);

          const app = await launchElectronApp({ userDataPath });
          try {
            const page = await waitForReadyPage(app, { timeout: 90_000 });
            await installProbes(page);
            if (await ensureCollectionsListed(app, page, collectionDirs)) {
              console.log(`[BENCHMARK] ${sizeKb}KB ${scenario.name}: collections were added through the Open collection dialog because they were not listed after launch`);
            }
            await page.waitForTimeout(800);
            if (scenario.mount) {
              measured.mountMs = await mountFirstCollection(page);
            }
            const { firstResultMs, settledMs, indexingMs } = await searchFor(page, SEARCH_TERM);
            measured.firstResultMs = firstResultMs;
            measured.settledMs = settledMs;
            measured.indexingMs = indexingMs;
            console.log(`[BENCHMARK] ${sizeKb}KB ${scenario.name}: first result ${Math.round(firstResultMs)} ms, settled ${Math.round(settledMs)} ms`);
          } catch (error) {
            measured.error = String((error as Error).message || error).split('\n')[0];
            console.log(`[BENCHMARK] ${sizeKb}KB ${scenario.name} failed: ${measured.error}`);
          } finally {
            await closeElectronApp(app);
          }
        }
      } finally {
        fs.rmSync(userDataPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
      }

      expect(sizeResult.scenarios.filter((s) => s.error).map((s) => `${s.scenario}: ${s.error}`)).toEqual([]);
    });
  }

  test.afterAll(() => {
    if (results.length) writeReport(results);
  });
});
