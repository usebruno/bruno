import { test, expect, closeElectronApp } from '../../../../playwright';
import path from 'path';
import fs from 'fs';
import { clearSearchIndex, waitForReadyPage, waitForCollectionMount } from '../../../utils/page';
import { buildSidebarLocators } from '../../../utils/page/sidebar';
import { readSnapshot } from '../../../utils/snapshot';
import { CACHE_MODES, writePreferences } from '../helpers';

const LARGE_REQUEST_COUNT = 8000;
const OTHER_REQUEST_COUNT = 2000;
const SEARCH_RESULT_TIMEOUT_MS = 20_000;
const MOUNT_TIMEOUT_MS = 300_000;
const HEADER_COUNT = 60;
const REQUESTS_PER_FOLDER = 200;

const writeYmlRequest = (dir: string, name: string, seq: number, url: string) => {
  const headers = Array.from({ length: HEADER_COUNT }, (_, i) => `    - name: X-Header-${i}\n      value: value-${seq}-${i}-padding-padding-padding`).join('\n');
  fs.writeFileSync(
    path.join(dir, `${name}.yml`),
    `info:\n  name: ${name}\n  type: http\n  seq: ${seq}\n\nhttp:\n  method: GET\n  url: ${url}\n  headers:\n${headers}\n`
  );
};

/** Writes a YAML collection whose requests carry ~5KB of headers each, plus one named needle request. */
const buildLargeYmlCollection = (dir: string, name: string, requestCount: number, needle: string) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'opencollection.yml'), `opencollection: 1.0.0\n\ninfo:\n  name: ${name}\n`);
  for (let f = 0; f * REQUESTS_PER_FOLDER < requestCount; f += 1) {
    const folderDir = path.join(dir, `folder-${f}`);
    fs.mkdirSync(folderDir, { recursive: true });
    fs.writeFileSync(path.join(folderDir, 'folder.yml'), `info:\n  name: folder-${f}\n  type: folder\n  seq: ${f + 1}\n`);
    const count = Math.min(REQUESTS_PER_FOLDER, requestCount - f * REQUESTS_PER_FOLDER);
    for (let r = 0; r < count; r += 1) {
      const seq = f * REQUESTS_PER_FOLDER + r + 1;
      writeYmlRequest(folderDir, `request-${seq}`, seq, `https://api.example.com/v1/resource/${seq}`);
    }
  }
  writeYmlRequest(dir, needle, 1, `https://${needle}.example/resource`);
  return dir;
};

for (const cacheMode of CACHE_MODES) {
  test(`[${cacheMode.label}] sidebar search works while a large collection mounts from the restored snapshot`, async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(900_000);
    const tag = cacheMode.enabled ? 'on' : 'off';
    const root = await createTmpDir(`search-snapshot-restore-${tag}`);
    const largeCollection = buildLargeYmlCollection(path.join(root, 'LargeRestored'), 'LargeRestored', LARGE_REQUEST_COUNT, 'metrics-large-needle');
    const otherCollection = buildLargeYmlCollection(path.join(root, 'OtherUnmounted'), 'OtherUnmounted', OTHER_REQUEST_COUNT, 'metrics-other-needle');

    const userDataPath = await createTmpDir(`search-snapshot-restore-user-${tag}`);
    // The first launch only seeds the snapshot, so it mounts through the file cache to stay fast.
    writePreferences(userDataPath, [largeCollection, otherCollection], true);

    await test.step('first launch: open a request in the large collection so the snapshot restores it', async () => {
      const app = await launchElectronApp({ userDataPath });
      const page = await waitForReadyPage(app);
      await clearSearchIndex(page);
      const sidebar = buildSidebarLocators(page);
      try {
        await page.getByTitle('Search requests').click();
        await page.getByTestId('sidebar-search-input').fill('metrics-large-needle');
        await expect(sidebar.itemRowIn('LargeRestored', 'metrics-large-needle')).toBeVisible({ timeout: SEARCH_RESULT_TIMEOUT_MS });
        await sidebar.itemRowIn('LargeRestored', 'metrics-large-needle').click();
        await page.getByTestId('sidebar-search-input').fill('');
        await waitForCollectionMount(page, 'LargeRestored', { timeout: MOUNT_TIMEOUT_MS });
        await expect(page.locator('.request-tab.active').filter({ hasText: 'metrics-large-needle' })).toBeVisible();
        // The snapshot is flushed in the background; wait until it contains the open request tab.
        await expect.poll(() => readSnapshot(userDataPath)?.collections?.some((collection: any) =>
          collection.pathname?.endsWith('LargeRestored')
          && collection.tabs?.some((tab: any) => tab.pathname?.includes('metrics-large-needle'))
        ) ?? false, { timeout: SEARCH_RESULT_TIMEOUT_MS }).toBe(true);
      } finally {
        await closeElectronApp(app);
      }
    });

    await test.step('second launch: search while the restored collection is still mounting', async () => {
      writePreferences(userDataPath, [largeCollection, otherCollection], cacheMode.enabled);
      const app = await launchElectronApp({ userDataPath });
      const page = await waitForReadyPage(app);
      const sidebar = buildSidebarLocators(page);
      try {
        await expect(page.locator('.request-tab').filter({ hasText: 'metrics-large-needle' })).toBeVisible({ timeout: SEARCH_RESULT_TIMEOUT_MS });

        await page.getByTitle('Search requests').click();
        await page.getByTestId('sidebar-search-input').fill('metrics-');
        await expect(sidebar.itemRowIn('OtherUnmounted', 'metrics-other-needle')).toBeVisible({ timeout: SEARCH_RESULT_TIMEOUT_MS });
        await expect(page.getByTestId('sidebar-search-match-count')).toBeVisible({ timeout: SEARCH_RESULT_TIMEOUT_MS });

        await waitForCollectionMount(page, 'LargeRestored', { timeout: MOUNT_TIMEOUT_MS });
        await expect(page.getByTestId('sidebar-search-match-count')).toHaveText('2 matches', { timeout: SEARCH_RESULT_TIMEOUT_MS });
        await expect(sidebar.itemRowIn('LargeRestored', 'metrics-large-needle')).toBeVisible({ timeout: SEARCH_RESULT_TIMEOUT_MS });
        await expect(sidebar.itemRowIn('OtherUnmounted', 'metrics-other-needle')).toBeVisible();
      } finally {
        await closeElectronApp(app);
      }
    });
  });
}
