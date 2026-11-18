import { test, expect, closeElectronApp } from '../../../../playwright';
import path from 'path';
import { clearSearchIndex, waitForReadyPage } from '../../../utils/page';
import { buildSidebarLocators } from '../../../utils/page/sidebar';
import { initBruCollection, writeBruRequest } from '../../../utils/fixtures/bru-collection';
import { writePreferences } from '../helpers';

test('offers indexing under the search bar and searches unopened collections after enabling it', async ({ launchElectronApp, createTmpDir }) => {
  test.setTimeout(120_000);
  const root = await createTmpDir('search-index-hint');
  const collectionA = path.join(root, 'CollectionA');
  const collectionB = path.join(root, 'CollectionB');
  initBruCollection(collectionA, 'CollectionA');
  initBruCollection(collectionB, 'CollectionB');
  writeBruRequest(collectionA, 'opened-hit', { seq: 1, url: 'https://opened.example/one' });
  writeBruRequest(collectionB, 'hidden-unmounted', { seq: 1, url: 'https://hidden.example/one' });

  const userDataPath = await createTmpDir('search-index-hint-userdata');
  writePreferences(userDataPath, [collectionA, collectionB], false, false);

  const app = await launchElectronApp({ userDataPath });
  const page = await waitForReadyPage(app);
  await clearSearchIndex(page);
  const sidebar = buildSidebarLocators(page);

  try {
    await test.step('show the indexing hint when search opens with the index off', async () => {
      await sidebar.searchToggle().click();
      await expect(sidebar.searchIndexHint()).toBeVisible();
      await expect(sidebar.searchIndexHint()).toContainText('Enable Indexing?');
      await sidebar.searchInput().fill('hidden-unmounted');
      await expect(sidebar.itemRow('hidden-unmounted')).toHaveCount(0);
    });

    await test.step('enable indexing from the hint and find the unopened collection', async () => {
      await sidebar.searchIndexHintEnable().click();
      await expect(page.getByText('Search index enabled')).toBeVisible();
      await expect(sidebar.searchIndexHint()).toHaveCount(0);
      await expect(sidebar.itemRow('hidden-unmounted')).toBeVisible({ timeout: 30_000 });
    });
  } finally {
    await closeElectronApp(app);
  }
});

test('does not show the indexing hint again after it is dismissed', async ({ launchElectronApp, createTmpDir }) => {
  test.setTimeout(120_000);
  const root = await createTmpDir('search-index-hint-dismiss');
  const collection = path.join(root, 'CollectionA');
  initBruCollection(collection, 'CollectionA');
  writeBruRequest(collection, 'opened-hit', { seq: 1, url: 'https://opened.example/one' });

  const userDataPath = await createTmpDir('search-index-hint-dismiss-userdata');
  writePreferences(userDataPath, [collection], false, false);

  const openSearch = async (page) => {
    const sidebar = buildSidebarLocators(page);
    await sidebar.searchToggle().click();
    await expect(sidebar.searchInput()).toBeVisible();
    return sidebar;
  };

  const app = await launchElectronApp({ userDataPath });
  const page = await waitForReadyPage(app);

  try {
    await test.step('dismiss the hint and keep it hidden after toggling search', async () => {
      const sidebar = await openSearch(page);
      await expect(sidebar.searchIndexHint()).toBeVisible();
      await sidebar.searchIndexHintDismiss().click();
      await expect(sidebar.searchIndexHint()).toHaveCount(0);
      await sidebar.searchToggle().click();
      await expect(sidebar.searchInput()).toHaveCount(0);
      await sidebar.searchToggle().click();
      await expect(sidebar.searchInput()).toBeVisible();
      await expect(sidebar.searchIndexHint()).toHaveCount(0);
    });
  } finally {
    await closeElectronApp(app);
  }

  await test.step('keep the hint hidden after relaunch', async () => {
    const relaunched = await launchElectronApp({ userDataPath });
    const nextPage = await waitForReadyPage(relaunched);
    try {
      const sidebar = await openSearch(nextPage);
      await expect(sidebar.searchIndexHint()).toHaveCount(0);
    } finally {
      await closeElectronApp(relaunched);
    }
  });
});
