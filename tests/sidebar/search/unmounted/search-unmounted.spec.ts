import { test, expect, closeElectronApp } from '../../../../playwright';
import path from 'path';
import { clearSearchIndex, waitForReadyPage } from '../../../utils/page';
import { buildSidebarLocators } from '../../../utils/page/sidebar';
import { initBruCollection, writeBruRequest } from '../../../utils/fixtures/bru-collection';
import { CACHE_MODES, writePreferences } from '../helpers';

for (const cacheMode of CACHE_MODES) {
  test(`[${cacheMode.label}] searches unmounted collections after multiple mounts`, async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(120_000);
    const root = await createTmpDir(`search-unmounted-${cacheMode.enabled ? 'on' : 'off'}`);
    const collectionA = path.join(root, 'CollectionA');
    const collectionB = path.join(root, 'CollectionB');
    const collectionC = path.join(root, 'CollectionC');

    initBruCollection(collectionA, 'CollectionA');
    initBruCollection(collectionB, 'CollectionB');
    initBruCollection(collectionC, 'CollectionC');
    writeBruRequest(collectionA, 'alpha-hit', { seq: 2, url: 'https://alpha.example/two' });
    writeBruRequest(collectionA, 'alpha-first', { seq: 1, url: 'https://alpha.example/one' });
    writeBruRequest(collectionB, 'plain-name', { seq: 1, url: 'https://payments.unique.example/charge' });
    writeBruRequest(collectionC, 'charlie-hit', { seq: 1, url: 'https://charlie.example/one' });

    const userDataPath = await createTmpDir(`search-unmounted-userdata-${cacheMode.enabled ? 'on' : 'off'}`);
    writePreferences(userDataPath, [collectionA, collectionB, collectionC], cacheMode.enabled);

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);
    await clearSearchIndex(page);
    const sidebar = buildSidebarLocators(page);
    const activeTab = (name: string) => page.locator('.request-tab.active').filter({ hasText: name });

    try {
      await test.step('mount two collections from name matches', async () => {
        await page.getByTitle('Search requests').click();
        const searchInput = page.getByTestId('sidebar-search-input');
        await searchInput.fill('alpha-hit');
        await expect(sidebar.itemRow('alpha-hit')).toBeVisible({ timeout: 30_000 });
        const collectionAChevron = sidebar.collectionRow('CollectionA').getByTestId('collection-chevron');
        await collectionAChevron.click();
        await expect(sidebar.itemRow('alpha-hit')).toHaveCount(0);
        await collectionAChevron.click();
        await expect(sidebar.itemRow('alpha-hit')).toBeVisible();
        await sidebar.itemRow('alpha-hit').click();
        await expect(activeTab('alpha-hit')).toBeVisible();

        await searchInput.fill('charlie-hit');
        await expect(sidebar.itemRow('charlie-hit')).toBeVisible({ timeout: 30_000 });
        await sidebar.itemRow('charlie-hit').click();
        await expect(activeTab('charlie-hit')).toBeVisible();
      });

      await test.step('find a URL-only match in the remaining unmounted collection', async () => {
        const searchInput = page.getByTestId('sidebar-search-input');
        await searchInput.fill('plain-name');
        await expect(sidebar.itemRow('plain-name')).toBeVisible({ timeout: 30_000 });
        await searchInput.fill('payments.unique');
        await expect(sidebar.itemRow('plain-name')).toBeVisible({ timeout: 30_000 });
        await expect(sidebar.itemRow('alpha-hit')).toHaveCount(0);
        await sidebar.itemRow('plain-name').click();
        await expect(activeTab('plain-name')).toBeVisible();
      });

      await test.step('search the first mounted collection again in sequence order', async () => {
        await page.getByTestId('sidebar-search-input').fill('alpha');
        await expect(sidebar.itemRow('alpha-first')).toBeVisible({ timeout: 30_000 });
        await expect(sidebar.itemRow('alpha-hit')).toBeVisible();
        const names = await page.getByTestId('sidebar-collection-item-row').locator('.item-name').allTextContents();
        expect(names).toEqual(['alpha-first', 'alpha-hit']);

        await page.getByTestId('sidebar-search-input').fill('');
        await expect(sidebar.collectionRows()).toHaveCount(3);
        await expect(page.locator('#sidebar-collection-name')).toHaveText(['CollectionA', 'CollectionB', 'CollectionC']);
      });
    } finally {
      await closeElectronApp(app);
    }
  });
}

test('[search index off] does not search unmounted collections', async ({ launchElectronApp, createTmpDir }) => {
  test.setTimeout(120_000);
  const root = await createTmpDir('search-index-off');
  const collectionA = path.join(root, 'CollectionA');
  initBruCollection(collectionA, 'CollectionA');
  writeBruRequest(collectionA, 'hidden-unmounted', { seq: 1, url: 'https://hidden.example/one' });

  const userDataPath = await createTmpDir('search-index-off-userdata');
  writePreferences(userDataPath, [collectionA], false, false);

  const app = await launchElectronApp({ userDataPath });
  const page = await waitForReadyPage(app);
  await clearSearchIndex(page);
  const sidebar = buildSidebarLocators(page);

  try {
    await page.getByTitle('Search requests').click();
    await page.getByTestId('sidebar-search-input').fill('hidden-unmounted');
    await expect(sidebar.itemRow('hidden-unmounted')).toHaveCount(0);
  } finally {
    await closeElectronApp(app);
  }
});
