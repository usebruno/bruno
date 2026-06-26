import { test, expect } from '../../../playwright';
import path from 'path';
import { Page } from '@playwright/test';
import {
  importCollection,
  createEnvironment,
  addRowToActiveTab,
  closeAllCollections,
  deleteAllGlobalEnvironments
} from '../../utils/page';

const collectionFile = path.join(__dirname, '..', 'create-environment', 'fixtures', 'bruno-collection.json');

const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
const tabDraftIcon = (page: Page) => page.locator('.request-tab.active').getByTestId('tab-draft-icon');

const saveWithShortcut = async (page: Page) => {
  await page.keyboard.press(`${modifier}+KeyS`);
};

test.describe('Environment save shortcut (Cmd/Ctrl+S)', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('saves a collection environment and shows the success toast', async ({ page, createTmpDir }) => {
    await importCollection(page, collectionFile, await createTmpDir('env-save-shortcut'), {
      expectedCollectionName: 'test_collection'
    });

    await createEnvironment(page, 'Shortcut Save Env', 'collection');

    await test.step('Add a variable to create an unsaved draft', async () => {
      await addRowToActiveTab(page, 'host', 'https://echo.usebruno.com');
      await expect(tabDraftIcon(page)).toBeVisible();
    });

    await test.step('Pressing the save shortcut shows the success toast', async () => {
      await saveWithShortcut(page);
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
    });

    await test.step('The unsaved-changes dot is gone once saved', async () => {
      await expect(tabDraftIcon(page)).not.toBeVisible();
    });
  });
});

test.describe('Global environment save shortcut (Cmd/Ctrl+S)', () => {
  test.afterEach(async ({ page }) => {
    await deleteAllGlobalEnvironments(page);
    await closeAllCollections(page);
  });

  test('saves a global environment and shows the success toast', async ({ page, createTmpDir }) => {
    await importCollection(page, collectionFile, await createTmpDir('global-env-save-shortcut'), {
      expectedCollectionName: 'test_collection'
    });

    await createEnvironment(page, 'Global Shortcut Save Env', 'global');

    await test.step('Add a variable to create an unsaved draft', async () => {
      await addRowToActiveTab(page, 'host', 'https://echo.usebruno.com');
      await expect(tabDraftIcon(page)).toBeVisible();
    });

    await test.step('Pressing the save shortcut shows the success toast', async () => {
      await saveWithShortcut(page);
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
    });

    await test.step('The unsaved-changes dot is gone once saved', async () => {
      await expect(tabDraftIcon(page)).not.toBeVisible();
    });
  });
});
