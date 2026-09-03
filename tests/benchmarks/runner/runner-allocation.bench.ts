// TODO - (chirag):
// This test runs on our testbench and we need a stable collection to benchmark.
// Have a discussion with the QA team (Abhishek) to come up with some collection.
// The numbers coming out of this collection becomes less dependable as the collection evolves.
import { test, expect } from '../../../playwright';
import { type Page, type ElectronApplication, type CDPSession } from '@playwright/test';
import {
  openCollection,
  closeAllCollections,
  selectEnvironment,
  openRunnerTab,
  buildRunnerLocators,
  buildCommonLocators
} from '../../utils/page';
import {
  RendererMemorySampler,
  MainMemorySampler,
  type RendererPhaseStats,
  type MainPhaseStats,
  type StatsByPhase
} from '../utils/memory';
import { writeResults, buildResultEntry, type ResultEntry } from '../utils/results';
import { formatMib } from '../utils/format';
import * as path from 'node:path';
import * as fs from 'node:fs';

const SOURCE_COLLECTION_DIR = path.join(process.cwd(), 'packages', 'bruno-tests', 'collection');
const COLLECTION_NAME = 'bruno-testbench';
const ENVIRONMENT = 'Local';
const ITERATIONS = 1;
const RUNS = 3;
const RUN_COMPLETION_TIMEOUT = 15 * 60 * 1000;
const REPORT_TIMEOUT = 5 * 60 * 1000;

const PHASE_RUN = 'collection-run';

interface RunMetrics {
  renderer: StatsByPhase<RendererPhaseStats>;
  main: StatsByPhase<MainPhaseStats>;
  rendererRetainedBytes: number;
}

const copyCollection = (destDir: string) => {
  fs.cpSync(SOURCE_COLLECTION_DIR, destDir, {
    recursive: true,
    filter: (src) => !src.split(path.sep).includes('node_modules')
  });
};

const openTestbench = async (page: Page, electronApp: ElectronApplication, dir: string) => {
  await test.step(`Open the ${COLLECTION_NAME} collection`, async () => {
    const locators = buildCommonLocators(page);
    await electronApp.evaluate(({ dialog }, dir) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] });
    }, dir);
    await locators.plusMenu.button().click();
    await locators.dropdown.tippyItem('Open collection').click();
    await expect(locators.sidebar.collection(COLLECTION_NAME)).toBeVisible({ timeout: 10000 });
    await openCollection(page, COLLECTION_NAME);
  });
};

const measureOneRun = async (
  page: Page,
  electronApp: ElectronApplication,
  cdp: CDPSession
): Promise<RunMetrics> => {
  const runner = buildRunnerLocators(page);

  await test.step('Reset to a clean runner state', async () => {
    const resetVisible = await runner.resetButton().isVisible({ timeout: 1000 }).catch(() => false);
    if (resetVisible) {
      await runner.resetButton().click();
    }
    await runner.runCollectionButton().waitFor({ state: 'visible', timeout: 10000 });
  });

  return test.step('Run the collection and sample renderer + main heap', async () => {
    const rendererSampler = await RendererMemorySampler.start(cdp, 200, PHASE_RUN);
    const mainSampler = await MainMemorySampler.start(electronApp, 100, PHASE_RUN);

    await runner.runCollectionButton().click();
    await runner.runAgainButton().waitFor({ timeout: RUN_COMPLETION_TIMEOUT });

    const renderer = await rendererSampler.terminate();
    const main = await mainSampler.terminate();
    const rendererRetainedBytes = await RendererMemorySampler.measureRetainedBytes(cdp);

    return { renderer, main, rendererRetainedBytes };
  });
};

test.describe('Benchmark: Runner allocation', () => {
  const runs: RunMetrics[] = [];
  let measuredPhases: string[] = [PHASE_RUN];

  test('renderer + main heap while running the bruno-testbench collection', async ({ page, electronApp, createTmpDir }) => {
    test.setTimeout(RUNS * (RUN_COMPLETION_TIMEOUT + REPORT_TIMEOUT) + 5 * 60 * 1000);

    const cdp = await page.context().newCDPSession(page);

    measuredPhases = [PHASE_RUN];

    const collectionDir = await test.step('Copy the collection to a temp dir', async () => {
      const dir = await createTmpDir('bruno-testbench');
      copyCollection(dir);
      return dir;
    });

    await openTestbench(page, electronApp, collectionDir);
    await openRunnerTab(page, COLLECTION_NAME);
    await selectEnvironment(page, ENVIRONMENT);

    for (let i = 0; i < RUNS; i++) {
      await test.step(`Run ${i + 1} of ${RUNS} (${ITERATIONS} iterations)`, async () => {
        const m = await measureOneRun(page, electronApp, cdp);
        runs.push(m);
        for (const phase of measuredPhases) {
          console.log(
            `[BENCHMARK] run ${i + 1}/${RUNS} (${ITERATIONS} iterations) — ${phase}: `
            + `renderer peak ${formatMib(m.renderer[phase].peakHeapUsedBytes)} · `
            + `main peak rss ${formatMib(m.main[phase].peakRssBytes)} / external ${formatMib(m.main[phase].peakExternalBytes)}`
          );
        }
        console.log(`[BENCHMARK] run ${i + 1}/${RUNS} — renderer retained ${formatMib(m.rendererRetainedBytes)}`);
      });
    }

    await closeAllCollections(page);
  });

  test.afterAll(async () => {
    if (!runs.length) return;
    const resultsDir = path.join(process.cwd(), 'tests', 'benchmarks', 'results');
    fs.mkdirSync(resultsDir, { recursive: true });
    const outputPath = path.join(resultsDir, 'runner-allocation.json');

    const meta = { collection: COLLECTION_NAME, iterations: ITERATIONS };
    const entries: Record<string, ResultEntry> = {
      'renderer-retained-heap': buildResultEntry(
        runs.map((r) => r.rendererRetainedBytes),
        { metric: 'renderer-retained-heap', ...meta }
      )
    };

    for (const phase of measuredPhases) {
      entries[`renderer-peak-heap:${phase}`] = buildResultEntry(
        runs.map((r) => r.renderer[phase].peakHeapUsedBytes),
        { metric: 'renderer-peak-heap', phase, ...meta }
      );
      entries[`main-peak-rss:${phase}`] = buildResultEntry(
        runs.map((r) => r.main[phase].peakRssBytes),
        { metric: 'main-peak-rss', phase, ...meta }
      );
      entries[`main-peak-external:${phase}`] = buildResultEntry(
        runs.map((r) => r.main[phase].peakExternalBytes),
        { metric: 'main-peak-external', phase, ...meta }
      );
    }

    writeResults(outputPath, { name: 'Runner Allocation', unit: 'bytes', direction: 'smaller' }, entries);
    console.log(`[BENCHMARK] Results written to ${outputPath}`);
  });
});
