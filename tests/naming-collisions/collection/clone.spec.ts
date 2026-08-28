import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  createCollection,
  closeAllCollections,
  openCloneCollectionModal,
  chooseCloneLocation
} from '../../utils/page';

test.describe('Naming collisions - clone collection', () => {
  test.afterEach(async ({ page }) => {
    await page.keyboard.press('Escape');
    await closeAllCollections(page);
  });

  test('cloning a collection opens a modal (unlike request/folder clone) defaulting to "<name> copy"', async ({ page, createTmpDir }) => {
    const { modal, sidebar } = buildCommonLocators(page);
    const testDir = await createTmpDir('collection-clone-modal');

    await createCollection(page, 'MyColl', testDir, 'bru');

    const cloneModal = modal.byTitle('Clone Collection');

    await test.step('Trigger clone: a modal appears (collection clone is not one-click)', async () => {
      await openCloneCollectionModal(page, 'MyColl');
      await expect(cloneModal).toBeVisible();
    });

    await test.step('Modal defaults to "MyColl copy" and exposes Location + Folder Name', async () => {
      await expect(sidebar.cloneCollectionModal.nameInput()).toHaveValue('MyColl copy');
      await expect(sidebar.cloneCollectionModal.locationInput()).toBeVisible();
      await expect(cloneModal.getByText('Folder Name')).toBeVisible();
    });

    // Close the modal so afterEach isn't blocked by the backdrop.
    await cloneModal.getByRole('button', { name: 'Cancel' }).click();
    await expect(cloneModal).toHaveCount(0, { timeout: 5000 });
  });

  test('cloning a collection to a location creates "<name> copy" on disk', async ({ page, electronApp, createTmpDir }) => {
    const { toast, modal } = buildCommonLocators(page);
    const sourceDir = await createTmpDir('collection-clone-src');
    const cloneLocation = await createTmpDir('collection-clone-dest');

    await createCollection(page, 'MyColl', sourceDir, 'bru');

    const cloneModal = modal.byTitle('Clone Collection');

    await test.step('Clone with default name to the chosen location', async () => {
      await openCloneCollectionModal(page, 'MyColl');
      await chooseCloneLocation(page, electronApp, cloneLocation);
      await cloneModal.getByRole('button', { name: 'Create', exact: true }).click();
      await expect(cloneModal).toHaveCount(0, { timeout: 5000 });
      await expect(toast.byMessage('Collection created!').first()).toBeVisible({ timeout: 5000 });
    });

    await test.step('On disk: a "MyColl copy" collection directory exists at the location', async () => {
      await expect
        .poll(() => fs.existsSync(path.join(cloneLocation, 'MyColl copy', 'bruno.json')), { timeout: 10000 })
        .toBe(true);
    });
  });

  test('cloning into a location that already has the folder name suffixes the directory', async ({ page, electronApp, createTmpDir }) => {
    const { toast, modal } = buildCommonLocators(page);
    const sourceDir = await createTmpDir('collection-clone-col-src');
    const cloneLocation = await createTmpDir('collection-clone-col-dest');

    await createCollection(page, 'MyColl', sourceDir, 'bru');
    // Seed a directory that collides with the default clone folder name.
    fs.mkdirSync(path.join(cloneLocation, 'MyColl copy'), { recursive: true });

    const cloneModal = modal.byTitle('Clone Collection');

    await test.step('Clone with default name/folder into the colliding location', async () => {
      await openCloneCollectionModal(page, 'MyColl');
      await chooseCloneLocation(page, electronApp, cloneLocation);
      await cloneModal.getByRole('button', { name: 'Create', exact: true }).click();
      await expect(cloneModal).toHaveCount(0, { timeout: 5000 });
      await expect(toast.byMessage('Collection created!').first()).toBeVisible({ timeout: 5000 });
    });

    await test.step('On disk: directory silently suffixed to "MyColl copy 1"', async () => {
      await expect
        .poll(() => fs.existsSync(path.join(cloneLocation, 'MyColl copy 1', 'bruno.json')), { timeout: 10000 })
        .toBe(true);
    });
  });
});
