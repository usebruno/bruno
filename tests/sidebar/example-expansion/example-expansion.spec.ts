import { test, expect, closeElectronApp } from '../../../playwright';
import path from 'path';
import { buildCommonLocators, collapseFolder, expandFolder, waitForReadyPage } from '../../utils/page';
import { initBruCollection, writeBruRequest, writeBruFolder } from '../../utils/fixtures/bru-collection';

const COLLECTION_NAME = 'ExampleCol';

const buildCollectionOnDisk = (dir: string) => {
  initBruCollection(dir, COLLECTION_NAME);
  writeBruRequest(dir, 'req-ex', { seq: 2, examples: ['ex-one', 'ex-two'] });

  const folderDir = writeBruFolder(dir, 'folder-a', 1);
  writeBruRequest(folderDir, 'nested-ex', { seq: 1, examples: ['ex-nested'] });
};

test.describe('Sidebar response-example expansion', () => {
  test('examples expand/collapse via the chevron and persist across parent collapse', async ({ launchElectronApp, createTmpDir }) => {
    const collectionDir = path.join(await createTmpDir('example-expansion'), COLLECTION_NAME);
    buildCollectionOnDisk(collectionDir);

    const app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data'),
      templateVars: { collectionPath: collectionDir.split(path.sep).join('/') }
    });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);
    const row = locators.sidebar.item;
    const example = locators.sidebar.example;
    const collectionChevron = locators.sidebar.collectionChevron(COLLECTION_NAME);
    const rootToggle = locators.sidebar.requestExamplesToggle('req-ex');
    const nestedToggle = locators.sidebar.requestExamplesToggle('nested-ex');
    const tabs = locators.tabs.allRequestTabs();

    try {
      await test.step('Open the collection from its chevron', async () => {
        // Expand via the chevron rather than the collection name. name click also opens a
        // collection-settings tab, which would mask the tab assertions.
        await collectionChevron.click();
        await expect(row('req-ex')).toBeVisible({ timeout: 15000 });
        await expect(row('folder-a')).toBeVisible();
      });

      await test.step('The chevron expands the request examples', async () => {
        const tabsBefore = await tabs.count();

        await rootToggle.click();
        await expect(example('ex-one')).toBeVisible();
        await expect(example('ex-two')).toBeVisible();
        // The chevron only toggles examples. it must not open the request in a tab.
        await expect(tabs).toHaveCount(tabsBefore);
      });

      await test.step('The chevron collapses them again', async () => {
        const tabsBefore = await tabs.count();

        await rootToggle.click();
        await expect(example('ex-one')).toHaveCount(0);
        await expect(example('ex-two')).toHaveCount(0);
        await expect(row('req-ex')).toBeVisible();
        await expect(tabs).toHaveCount(tabsBefore);
      });

      await test.step('Collapsing and re-expanding the collection preserves the expansion', async () => {
        await rootToggle.click();
        await expect(example('ex-one')).toBeVisible();

        await collectionChevron.click();
        await expect(row('req-ex')).toHaveCount(0);
        await collectionChevron.click();
        await expect(row('req-ex')).toBeVisible();

        await expect(rootToggle).toBeVisible();
        await expect(example('ex-one')).toBeVisible();
        await expect(example('ex-two')).toBeVisible();
      });

      await test.step('The chevron still collapses them after the remount', async () => {
        await rootToggle.click();
        await expect(example('ex-one')).toHaveCount(0);
        await expect(example('ex-two')).toHaveCount(0);
        await rootToggle.click();
        await expect(example('ex-one')).toBeVisible();
      });

      await test.step('Collapsing and re-expanding a folder preserves its request examples', async () => {
        await expandFolder(page, 'folder-a');
        await nestedToggle.click();
        await expect(example('ex-nested')).toBeVisible();

        await collapseFolder(page, 'folder-a');
        await expect(row('nested-ex')).toHaveCount(0);
        await expandFolder(page, 'folder-a');
        await expect(row('nested-ex')).toBeVisible();

        await expect(nestedToggle).toBeVisible();
        await expect(example('ex-nested')).toBeVisible();
      });

      await test.step('A folder collapse leaves sibling rows outside it untouched', async () => {
        await expect(example('ex-one')).toBeVisible();
        await expect(example('ex-two')).toBeVisible();
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
