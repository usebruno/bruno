import * as fs from 'fs';
import * as path from 'path';
import { test, expect, Page } from '../../../playwright';
import { buildCommonLocators, createCollection, closeAllCollections } from '../../utils/page';

/** Open the Clone Collection modal from a collection's actions menu. */
const openCloneCollectionModal = async (page: Page, collectionName: string) => {
  const locators = buildCommonLocators(page);
  await locators.sidebar.collection(collectionName).hover();
  const action = locators.actions.collectionActions(collectionName);
  await expect(action).toBeVisible({ timeout: 5000 });
  await action.click();
  await locators.dropdown.item('Clone').click();
};

/**
 * Choose the clone Location. The field is read-only and set only via the native
 * directory picker, so we mock `dialog.showOpenDialog` and click "Browse".
 */
const chooseCloneLocation = async (page: Page, electronApp: any, location: string) => {
  await electronApp.evaluate(({ dialog }: any, dir: string) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] });
  }, location);
  await page.getByText('Browse', { exact: true }).click();
  await expect(page.locator('#collection-location')).toHaveValue(location);
};

test.describe('Naming collisions - clone collection', () => {
  test.afterEach(async ({ page }) => {
    await page.keyboard.press('Escape');
    await closeAllCollections(page);
  });

  test('cloning a collection opens a modal (unlike request/folder clone) defaulting to "<name> copy"', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('collection-clone-modal');

    await createCollection(page, 'MyColl', testDir, 'bru');

    const modal = page.locator('.bruno-modal').filter({ hasText: 'Clone Collection' });

    await test.step('Trigger clone: a modal appears (collection clone is not one-click)', async () => {
      await openCloneCollectionModal(page, 'MyColl');
      await expect(modal).toBeVisible();
    });

    await test.step('Modal defaults to "MyColl copy" and exposes Location + Folder Name', async () => {
      await expect(page.locator('#collection-name')).toHaveValue('MyColl copy');
      await expect(page.locator('#collection-location')).toBeVisible();
      await expect(modal.getByText('Folder Name')).toBeVisible();
    });

    // Close the modal so afterEach isn't blocked by the backdrop.
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).toHaveCount(0, { timeout: 5000 });
  });

  test('cloning a collection to a location creates "<name> copy" on disk', async ({ page, electronApp, createTmpDir }) => {
    const sourceDir = await createTmpDir('collection-clone-src');
    const cloneLocation = await createTmpDir('collection-clone-dest');

    await createCollection(page, 'MyColl', sourceDir, 'bru');

    const modal = page.locator('.bruno-modal').filter({ hasText: 'Clone Collection' });

    await test.step('Clone with default name to the chosen location', async () => {
      await openCloneCollectionModal(page, 'MyColl');
      await chooseCloneLocation(page, electronApp, cloneLocation);
      await modal.getByRole('button', { name: 'Create', exact: true }).click();
      await expect(modal).toHaveCount(0, { timeout: 5000 });
      await expect(page.getByText('Collection created!').first()).toBeVisible({ timeout: 5000 });
    });

    await test.step('On disk: a "MyColl copy" collection directory exists at the location', async () => {
      await expect
        .poll(() => fs.existsSync(path.join(cloneLocation, 'MyColl copy', 'bruno.json')), { timeout: 10000 })
        .toBe(true);
    });
  });

  test('cloning into a location that already has the folder name suffixes the directory', async ({ page, electronApp, createTmpDir }) => {
    const sourceDir = await createTmpDir('collection-clone-col-src');
    const cloneLocation = await createTmpDir('collection-clone-col-dest');

    await createCollection(page, 'MyColl', sourceDir, 'bru');
    // Seed a directory that collides with the default clone folder name.
    fs.mkdirSync(path.join(cloneLocation, 'MyColl copy'), { recursive: true });

    const modal = page.locator('.bruno-modal').filter({ hasText: 'Clone Collection' });

    await test.step('Clone with default name/folder into the colliding location', async () => {
      await openCloneCollectionModal(page, 'MyColl');
      await chooseCloneLocation(page, electronApp, cloneLocation);
      await modal.getByRole('button', { name: 'Create', exact: true }).click();
      await expect(modal).toHaveCount(0, { timeout: 5000 });
      await expect(page.getByText('Collection created!').first()).toBeVisible({ timeout: 5000 });
    });

    await test.step('On disk: directory silently suffixed to "MyColl copy1"', async () => {
      await expect
        .poll(() => fs.existsSync(path.join(cloneLocation, 'MyColl copy1', 'bruno.json')), { timeout: 10000 })
        .toBe(true);
    });
  });
});
