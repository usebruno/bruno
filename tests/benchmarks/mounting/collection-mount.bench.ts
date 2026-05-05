import { test } from '../../../playwright';
import { type ElectronApplication, type Page } from '@playwright/test';
import { openCollection, closeAllCollections } from '../../utils/page';
import { summarize } from '../utils/stats';
import { writeResults, buildResultEntry, type ResultEntry } from '../utils/results';
import { generateCollection, type CollectionFormat } from '../utils/collection-generator';
import * as path from 'path';
import * as fs from 'fs';

const COLLECTION_SIZES = [50, 200, 500, 1000, 3000];
const COLLECTION_FORMATS: CollectionFormat[] = ['bru', 'yml'];
const ITERATIONS_PER_SIZE = 3;

async function measureCollectionMount(
  page: Page,
  electronApp: ElectronApplication,
  collectionDir: string,
  collectionName: string
): Promise<number> {
  await electronApp.evaluate(
    ({ dialog }, { dir }) => {
      (dialog as any).__originalShowOpenDialog ??= dialog.showOpenDialog;
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] });
    },
    { dir: collectionDir }
  );

  await page.evaluate(() => {
    (window as any).__benchMountDone = new Promise<void>((resolve) => {
      const off = (window as any).ipcRenderer.on('main:collection-loading-state-updated', (val: any) => {
        if (!val.isLoading) {
          off(); resolve();
        }
      });
    });
  });

  const start = performance.now();

  await page.getByTestId('collections-header-add-menu').click();
  await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Open collection' }).click();
  await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).waitFor({ state: 'visible' });

  await openCollection(page, collectionName);
  await page.evaluate(() => (window as any).__benchMountDone);

  const elapsed = performance.now() - start;

  await electronApp.evaluate(({ dialog }) => {
    if ((dialog as any).__originalShowOpenDialog) {
      dialog.showOpenDialog = (dialog as any).__originalShowOpenDialog;
    }
  });

  await closeAllCollections(page);

  return elapsed;
}

function resultKey(format: CollectionFormat, size: number): string {
  return `${format}-${size}`;
}

test.describe('Benchmark: Collection Mount', () => {
  const results: Record<string, number[]> = {};

  for (const format of COLLECTION_FORMATS) {
    test.describe(`format: ${format}`, () => {
      for (const size of COLLECTION_SIZES) {
        test(`mount ${format} collection with ${size} requests`, async ({ page, electronApp, createTmpDir }) => {
          test.setTimeout((2 + Math.ceil(size / 100) * 2) * 60_000);
          const timings: number[] = [];

          const collectionName = `bench-${format}-${size}`;
          const collectionDir = await createTmpDir(`bench-${format}-${size}`);
          generateCollection({ dir: collectionDir, name: collectionName, requestCount: size, format });

          for (let i = 0; i < ITERATIONS_PER_SIZE; i++) {
            const elapsed = await measureCollectionMount(page, electronApp, collectionDir, collectionName);
            timings.push(Math.round(elapsed));
          }

          const key = resultKey(format, size);
          results[key] = timings;

          const stats = summarize(timings);
          const r = (v: number) => Math.round(v);
          console.log(`[BENCHMARK] ${format} ${size} requests — mean: ${r(stats.mean)}ms, median: ${r(stats.median)}ms, p90: ${r(stats.p90)}ms, stdDev: ${r(stats.stdDev)}ms, raw: [${timings.join(', ')}]`);

          test.info().annotations.push({
            type: 'benchmark',
            description: JSON.stringify({ format, size, ...stats, timings })
          });
        });
      }
    });
  }

  test.afterAll(async () => {
    const resultsDir = path.join(process.cwd(), 'tests', 'benchmarks', 'results');
    fs.mkdirSync(resultsDir, { recursive: true });
    const outputPath = path.join(resultsDir, 'mounting.json');
    const entries: Record<string, ResultEntry> = {};

    for (const [key, timings] of Object.entries(results)) {
      if (timings.length === 0) continue;
      const [format, sizeStr] = key.split('-');
      entries[key] = buildResultEntry(timings, { format, size: Number(sizeStr) });
    }

    writeResults(outputPath, entries);
    console.log(`[BENCHMARK] Results written to ${outputPath}`);
  });
});
