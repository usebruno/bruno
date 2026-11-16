import { test, expect, ElectronApplication, Page } from '../../../playwright';
import * as path from 'path';
import {
  buildCommonLocators,
  closeAllCollections,
  openCollectionFromDialog,
  restoreOpenDialog,
  stashOpenDialog
} from '../../utils/page';

/** A collection the picker should discover: its name, and the location it reports relative to the picked folder. */
type DiscoveredCollection = { name: string; location: string };

const openEveryCollectionUnder = async (
  page: Page,
  electronApp: ElectronApplication,
  root: string,
  expected: DiscoveredCollection[]
) => {
  const { modal, openCollectionPicker, sidebar } = buildCommonLocators(page);

  await openCollectionFromDialog(page, electronApp, root);

  await test.step('The modal lists every discovered collection at its nested location', async () => {
    await expect(modal.byTitle('Open Collection')).toBeVisible();
    await expect(openCollectionPicker.titles()).toHaveCount(expected.length);
    for (const { name, location } of expected) {
      await expect(openCollectionPicker.itemDescription(name)).toHaveText(location);
    }
  });

  await test.step('Select every collection and open them', async () => {
    await openCollectionPicker.selectAllToggle().click();
    await expect(modal.footer()).toContainText(`${expected.length} of ${expected.length} selected`);
    await modal.button('Open').click();
  });

  await test.step('Every selected collection is in the sidebar', async () => {
    for (const { name } of expected) {
      await expect(sidebar.collection(name)).toBeVisible();
    }
  });
};

test.describe('Open nested collections', () => {
  test.beforeAll(async ({ electronApp }) => {
    await stashOpenDialog(electronApp);
  });

  test.afterAll(async ({ electronApp }) => {
    await restoreOpenDialog(electronApp);
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-4448: lists a collection folder alongside the sibling collections inside it and opens all of them', async ({
    page,
    electronApp,
    collectionFixturePath
  }) => {
    const root = path.join(collectionFixturePath!, 'nested-siblings');

    await openEveryCollectionUnder(page, electronApp, root, [
      // The picked folder is itself a collection, so it reports its own folder name.
      { name: 'Parent Collection', location: 'nested-siblings' },
      { name: 'Alpha Collection', location: 'alpha' },
      { name: 'Beta Collection', location: 'beta' }
    ]);
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
