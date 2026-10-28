import { test, expect, closeElectronApp } from '../../../../playwright';
import path from 'path';
import { clearSearchIndex, waitForReadyPage, waitForCollectionMount } from '../../../utils/page';
import { buildSidebarLocators } from '../../../utils/page/sidebar';
import {
  buildPressureCollection,
  PRESSURE_REQUEST_COUNT,
  V1_PRESSURE_REQUEST_COUNT,
  startMountingCollections,
  writePreferences
} from './helpers';

const SEARCH_RESULT_TIMEOUT_MS = 20_000;
const INDEXING_TIMEOUT_MS = 180_000;
const MOUNT_TIMEOUT_MS = 180_000;
const cacheModes = [
  { label: 'file cache off', enabled: false, requestCount: V1_PRESSURE_REQUEST_COUNT },
  { label: 'file cache on', enabled: true, requestCount: PRESSURE_REQUEST_COUNT }
];

for (const cacheMode of cacheModes) {
  test(`[${cacheMode.label}] sidebar search indexes and finds requests while a collection mounts`, async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(420_000);
    const tag = cacheMode.enabled ? 'on' : 'off';
    const root = await createTmpDir(`search-mount-pressure-${tag}`);
    const collectionA = buildPressureCollection(path.join(root, 'PressureA'), 'PressureA', {
      name: 'needle-alpha-unique',
      url: 'https://needle-alpha.unique.example/resource'
    }, cacheMode.requestCount);
    const collectionB = buildPressureCollection(path.join(root, 'PressureB'), 'PressureB', {
      name: 'needle-bravo-unique',
      url: 'https://needle-bravo.unique.example/resource'
    }, cacheMode.requestCount);

    const userDataPath = await createTmpDir(`search-mount-pressure-user-${tag}`);
    writePreferences(userDataPath, [collectionA, collectionB], cacheMode.enabled);

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);
    await clearSearchIndex(page);
    const sidebar = buildSidebarLocators(page);
    const searchInput = page.getByTestId('sidebar-search-input');
    const matchCount = page.getByTestId('sidebar-search-match-count');
    const indexingLoader = page.getByTestId('sidebar-search-indexing');
    const allItemRows = page.getByTestId('sidebar-collection-item-row');
    const totalRequests = cacheMode.requestCount * 2;

    try {
      await test.step('an empty search term shows no loader or count while PressureA mounts', async () => {
        await expect(sidebar.collectionRow('PressureA')).toBeVisible();
        await expect(sidebar.collectionRow('PressureB')).toBeVisible();
        await page.getByTitle('Search requests').click();
        await expect(searchInput).toBeVisible();
        await expect(indexingLoader).toHaveCount(0);

        // Only PressureA is mounted, so the search below spans a collection that is mid-mount and
        // one (PressureB) that stays unmounted.
        await startMountingCollections(page, [{ name: 'PressureA', pathname: collectionA }], cacheMode.enabled);
        await expect(sidebar.collectionRow('PressureA').locator('.animate-spin')).toBeVisible();

        await expect(indexingLoader).toHaveCount(0);
        await expect(matchCount).toHaveCount(0);
      });

      await test.step('a broad search shows the loader until every request is indexed, then counts them all', async () => {
        await searchInput.fill('resource/');
        await expect(indexingLoader).toBeVisible({ timeout: SEARCH_RESULT_TIMEOUT_MS });
        await expect(indexingLoader).toBeHidden({ timeout: INDEXING_TIMEOUT_MS });

        await expect(matchCount).toHaveText(`${totalRequests} matches`, { timeout: SEARCH_RESULT_TIMEOUT_MS });
        // The needle requests have no "resource/" in their URL, so they are filtered out.
        await expect(sidebar.itemRowIn('PressureA', 'needle-alpha-unique')).toHaveCount(0);
        await expect(sidebar.itemRowIn('PressureB', 'needle-bravo-unique')).toHaveCount(0);
        await expect(sidebar.itemRowIn('PressureA', 'folder-0')).toBeVisible();
      });

      await test.step('name match in mounting collection A shows only that request with 1 match', async () => {
        await searchInput.fill('needle-alpha');
        await expect(matchCount).toHaveText('1 match', { timeout: SEARCH_RESULT_TIMEOUT_MS });
        await expect(sidebar.itemRowIn('PressureA', 'needle-alpha-unique')).toBeVisible({ timeout: SEARCH_RESULT_TIMEOUT_MS });
        await expect(sidebar.itemRowIn('PressureB', 'needle-bravo-unique')).toHaveCount(0);
        await expect(allItemRows).toHaveCount(1);
        await expect(indexingLoader).toBeHidden({ timeout: INDEXING_TIMEOUT_MS });
      });

      await test.step('name match in unmounted collection B shows only that request with 1 match', async () => {
        await searchInput.fill('needle-bravo');
        await expect(matchCount).toHaveText('1 match', { timeout: SEARCH_RESULT_TIMEOUT_MS });
        await expect(sidebar.itemRowIn('PressureB', 'needle-bravo-unique')).toBeVisible({ timeout: SEARCH_RESULT_TIMEOUT_MS });
        await expect(sidebar.itemRowIn('PressureA', 'needle-alpha-unique')).toHaveCount(0);
        await expect(allItemRows).toHaveCount(1);
        await expect(indexingLoader).toBeHidden({ timeout: INDEXING_TIMEOUT_MS });
      });

      await test.step('URL-only match is found in both collections', async () => {
        // The last generated request exists once per collection and no other URL contains this string.
        const lastRequest = `request-${cacheMode.requestCount}`;
        await searchInput.fill(`resource/${cacheMode.requestCount}`);
        await expect(matchCount).toHaveText('2 matches', { timeout: SEARCH_RESULT_TIMEOUT_MS });
        await expect(sidebar.itemRowIn('PressureA', lastRequest)).toBeVisible({ timeout: SEARCH_RESULT_TIMEOUT_MS });
        await expect(sidebar.itemRowIn('PressureB', lastRequest)).toBeVisible({ timeout: SEARCH_RESULT_TIMEOUT_MS });
        await expect(sidebar.itemRowIn('PressureA', 'needle-alpha-unique')).toHaveCount(0);
        await expect(sidebar.itemRowIn('PressureB', 'needle-bravo-unique')).toHaveCount(0);
        await expect(indexingLoader).toBeHidden({ timeout: INDEXING_TIMEOUT_MS });
      });

      await test.step('results span the mounted collection A and the unmounted collection B', async () => {
        await waitForCollectionMount(page, 'PressureA', { timeout: MOUNT_TIMEOUT_MS });

        await searchInput.fill('needle-');
        await expect(matchCount).toHaveText('2 matches', { timeout: SEARCH_RESULT_TIMEOUT_MS });
        await expect(sidebar.itemRowIn('PressureA', 'needle-alpha-unique')).toBeVisible({ timeout: SEARCH_RESULT_TIMEOUT_MS });
        await expect(sidebar.itemRowIn('PressureB', 'needle-bravo-unique')).toBeVisible({ timeout: SEARCH_RESULT_TIMEOUT_MS });
        await expect(allItemRows).toHaveCount(2);
        await expect(indexingLoader).toBeHidden({ timeout: INDEXING_TIMEOUT_MS });
      });

      await test.step('query with no matches shows no request rows and 0 matches', async () => {
        await searchInput.fill('no-such-request-anywhere');
        await expect(matchCount).toHaveText('0 matches', { timeout: SEARCH_RESULT_TIMEOUT_MS });
        await expect(allItemRows).toHaveCount(0);
        await expect(indexingLoader).toBeHidden({ timeout: INDEXING_TIMEOUT_MS });
      });

      await test.step('clearing the search hides the loader and the count', async () => {
        await searchInput.fill('');
        await expect(matchCount).toHaveCount(0);
        await expect(indexingLoader).toHaveCount(0);
        await expect(sidebar.collectionRows()).toHaveCount(2);
      });
    } finally {
      await closeElectronApp(app);
    }
  });
}
