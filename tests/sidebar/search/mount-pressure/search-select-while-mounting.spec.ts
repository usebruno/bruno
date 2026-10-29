import { test, expect, closeElectronApp } from '../../../../playwright';
import { clearSearchIndex, waitForReadyPage, waitForCollectionMount } from '../../../utils/page';
import { buildSidebarLocators } from '../../../utils/page/sidebar';
import { buildPressureCollections, PRESSURE_CACHE_MODES, writePreferences } from '../helpers';

const SEARCH_RESULT_TIMEOUT_MS = 30_000;
const MOUNT_TIMEOUT_MS = 180_000;

for (const cacheMode of PRESSURE_CACHE_MODES) {
  test(`[${cacheMode.label}] selecting a search result in another collection while the first one mounts opens both`, async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(420_000);
    const tag = cacheMode.enabled ? 'on' : 'off';
    const root = await createTmpDir(`search-select-while-mounting-${tag}`);
    const [collectionA, collectionB] = buildPressureCollections(root, cacheMode.requestCount);

    const userDataPath = await createTmpDir(`search-select-while-mounting-user-${tag}`);
    writePreferences(userDataPath, [collectionA, collectionB], cacheMode.enabled);

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);
    await clearSearchIndex(page);
    const sidebar = buildSidebarLocators(page);
    const searchInput = page.getByTestId('sidebar-search-input');
    const requestTab = (name: string) => page.locator('.request-tab').filter({ hasText: name });
    const activeTab = (name: string) => page.locator('.request-tab.active').filter({ hasText: name });

    try {
      await test.step('select a result in unmounted PressureA, which starts mounting it', async () => {
        await page.getByTitle('Search requests').click();
        await searchInput.fill('needle-alpha');
        await expect(sidebar.itemRowIn('PressureA', 'needle-alpha-unique')).toBeVisible({ timeout: SEARCH_RESULT_TIMEOUT_MS });
        await sidebar.itemRowIn('PressureA', 'needle-alpha-unique').click();
        await expect(sidebar.collectionRow('PressureA').locator('.animate-spin')).toBeVisible();
      });

      await test.step('while PressureA mounts, search again and select a result in unmounted PressureB', async () => {
        await searchInput.fill('needle-bravo');
        await expect(sidebar.itemRowIn('PressureB', 'needle-bravo-unique')).toBeVisible({ timeout: SEARCH_RESULT_TIMEOUT_MS });
        await sidebar.itemRowIn('PressureB', 'needle-bravo-unique').click();
      });

      await test.step('both collections mount and both selected requests open, the last one active', async () => {
        await searchInput.fill('');
        await waitForCollectionMount(page, 'PressureA', { timeout: MOUNT_TIMEOUT_MS });
        await waitForCollectionMount(page, 'PressureB', { timeout: MOUNT_TIMEOUT_MS });
        await expect(activeTab('needle-bravo-unique')).toBeVisible();

        // The tab strip only lists tabs of the active tab's collection.
        await sidebar.collectionRow('PressureA').click();
        await expect(requestTab('needle-alpha-unique')).toBeVisible();
      });

      await test.step('the search still filters across both mounted collections', async () => {
        await searchInput.fill('needle-');
        await expect(sidebar.itemRowIn('PressureA', 'needle-alpha-unique')).toBeVisible({ timeout: SEARCH_RESULT_TIMEOUT_MS });
        await expect(sidebar.itemRowIn('PressureB', 'needle-bravo-unique')).toBeVisible({ timeout: SEARCH_RESULT_TIMEOUT_MS });
        await expect(page.getByTestId('sidebar-collection-item-row')).toHaveCount(2);
      });
    } finally {
      await closeElectronApp(app);
    }
  });
}
