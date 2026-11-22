import { test, expect, ElectronApplication, Page } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators, closeAllCollections } from '../../../pages';
import { buildOpenCollectionModalLocators, closeOpenCollectionModal } from '../../../pages/open-collection-modal/shell';
import { buildChooseFolderLocators, chooseFolders } from '../../../pages/open-collection-modal/choose-folder';

/** A collection the picker should discover: its name, and the location it reports relative to the picked folder. */
type DiscoveredCollection = { name: string; location: string };

const openEveryCollectionUnder = async (
  page: Page,
  electronApp: ElectronApplication,
  root: string,
  expected: DiscoveredCollection[]
) => {
  const { sidebar } = buildCommonLocators(page);
  const openCollectionModal = buildOpenCollectionModalLocators(page);
  const chooseFolder = buildChooseFolderLocators(page);

  await chooseFolders(page, electronApp, [root]);

  await test.step('The modal lists every discovered collection at its nested location', async () => {
    await expect(chooseFolder.rows()).toHaveCount(expected.length);
    for (const { name, location } of expected) {
      await expect(chooseFolder.rowMeta(name)).toHaveText(location);
    }
  });

  await test.step('Select every collection and open them', async () => {
    await chooseFolder.selectAll().click();
    await expect(chooseFolder.openSelectedButton()).toHaveText(`Open ${expected.length} collections`);
    await chooseFolder.openSelectedButton().click();
    await expect(openCollectionModal.root()).toBeHidden();
  });

  await test.step('Every selected collection is in the sidebar', async () => {
    for (const { name } of expected) {
      await expect(sidebar.collection(name)).toBeVisible();
    }
  });
};

test.describe('Open nested collections', () => {
  test.afterEach(async ({ page }) => {
    await closeOpenCollectionModal(page);
    await closeAllCollections(page);
  });

  test('TC-4448: opens a picked collection folder directly and leaves the collections nested inside it closed', async ({
    page,
    electronApp,
    collectionFixturePath
  }) => {
    const { sidebar } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await chooseFolders(page, electronApp, [path.join(collectionFixturePath!, 'nested-siblings')]);

    await test.step('The picked collection opens without a list and the nested ones stay closed', async () => {
      await expect(openCollectionModal.root()).toBeHidden();
      await expect(sidebar.collection('Parent Collection')).toBeVisible();
      await expect(sidebar.collection('Alpha Collection')).toHaveCount(0);
      await expect(sidebar.collection('Beta Collection')).toHaveCount(0);
    });
  });

  test('TC-4449: discovers collections several folders below the picked root and opens all of them', async ({
    page,
    electronApp,
    collectionFixturePath
  }) => {
    const root = path.join(collectionFixturePath!, 'deeply-nested');

    await openEveryCollectionUnder(page, electronApp, root, [
      { name: 'Payments Collection', location: 'services/payments/v1' },
      { name: 'Identity Collection', location: 'services/identity/internal/v2' },
      { name: 'Inventory Collection', location: 'teams/platform/apis/internal/inventory' }
    ]);
  });
});
