import { test, expect, closeElectronApp } from '../../../../playwright';
import path from 'path';
import { clearSearchIndex, waitForReadyPage, waitForCollectionMount } from '../../../utils/page';
import { buildSidebarLocators } from '../../../utils/page/sidebar';
import { buildLargeYmlCollection, writePreferences } from './helpers';

const LARGE_REQUEST_COUNT = 8000;
const OTHER_REQUEST_COUNT = 2000;
const SEARCH_RESULT_TIMEOUT_MS = 20_000;
const MOUNT_TIMEOUT_MS = 300_000;
const cacheModes = [
  { label: 'file cache off', enabled: false },
  { label: 'file cache on', enabled: true }
];

for (const cacheMode of cacheModes) {
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
        // The snapshot is flushed in the background.
        await page.waitForTimeout(3000);
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
        await expect(page.locator('.request-tab').filter({ hasText: 'metrics-large-needle' })).toBeVisible();

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
