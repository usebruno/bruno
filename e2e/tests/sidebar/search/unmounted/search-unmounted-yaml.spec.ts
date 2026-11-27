import { test, expect, closeElectronApp } from '../../../../playwright';
import path from 'path';
import {
  clearSearchIndex
} from '../../../../pages';
import {
  waitForReadyPage
} from '../../../../utils';
import { buildSidebarLocators } from '../../../../pages/sidebar/collection-tree';
import { initYmlCollection, writePreferences, writeYmlRequest } from '../helpers';

test('searches an unmounted YAML collection by name and URL', async ({ launchElectronApp, createTmpDir }) => {
  test.setTimeout(120_000);
  const root = await createTmpDir('search-unmounted-yaml');
  const yamlCollection = path.join(root, 'YamlCollection');
  const bruCollection = path.join(root, 'BruCollection');
  initYmlCollection(yamlCollection, 'YamlCollection');
  writeYmlRequest(yamlCollection, 'yaml-hit', { seq: 1, url: 'https://yaml.unique.example/charge' });
  writeYmlRequest(yamlCollection, 'yaml-other', { seq: 2, url: 'https://yaml.other.example/skip' });
  initYmlCollection(bruCollection, 'BruCollection');
  writeYmlRequest(bruCollection, 'unrelated', { seq: 1, url: 'https://unrelated.example/one' });

  const userDataPath = await createTmpDir('search-unmounted-yaml-userdata');
  writePreferences(userDataPath, [yamlCollection, bruCollection], true);

  const app = await launchElectronApp({ userDataPath });
  const page = await waitForReadyPage(app);
  await clearSearchIndex(page);
  const sidebar = buildSidebarLocators(page);

  try {
    await sidebar.searchToggle().click();

    await test.step('find the YAML request by name while the collection is unmounted', async () => {
      await sidebar.searchInput().fill('yaml-hit');
      await expect(sidebar.itemRow('yaml-hit')).toBeVisible({ timeout: 30_000 });
      await expect(sidebar.searchMatchCount()).toHaveText('1 match');
      await expect(sidebar.itemRow('yaml-other')).toHaveCount(0);
    });

    await test.step('find the YAML request by URL while the collection is unmounted', async () => {
      await sidebar.searchInput().fill('yaml.unique');
      await expect(sidebar.itemRow('yaml-hit')).toBeVisible({ timeout: 30_000 });
      await expect(sidebar.searchMatchCount()).toHaveText('1 match');
      await expect(sidebar.itemRow('unrelated')).toHaveCount(0);
    });
  } finally {
    await closeElectronApp(app);
  }
});
