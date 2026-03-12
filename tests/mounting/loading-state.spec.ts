import { test, expect } from '../../playwright';
import {
  openCollectionFromPath,
  waitForCollectionMount,
  isCollectionLoading
} from '../utils/page';
import { closeAllCollections } from '../utils/page';
import * as path from 'path';

const formats = ['bru', 'yml'] as const;

for (const format of formats) {
  test.describe(`[${format}] Loading State`, () => {
    const fixturePath = path.join(__dirname, `fixtures/${format}/small-collection`);

    test.afterEach(async ({ page }) => {
      await closeAllCollections(page);
    });

    test('should show loading spinner when collection mount starts', async ({
      page,
      electronApp
    }) => {
      // Open collection and immediately check for loading state
      await openCollectionFromPath(page, electronApp, fixturePath);

      // The collection should appear in the sidebar
      const collectionRow = page.getByTestId('sidebar-collection-row').filter({
        has: page.locator('#sidebar-collection-name', { hasText: 'Small Collection' })
      });
      await expect(collectionRow).toBeVisible({ timeout: 10000 });

      // Wait for mount to complete
      await waitForCollectionMount(page, 'Small Collection');
    });

    test('should hide loading spinner when collection mount completes', async ({
      page,
      electronApp
    }) => {
      // Open collection
      await openCollectionFromPath(page, electronApp, fixturePath);

      // Wait for mount to complete
      await waitForCollectionMount(page, 'Small Collection');

      // Verify loading spinner is gone
      const collectionRow = page.getByTestId('sidebar-collection-row').filter({
        has: page.locator('#sidebar-collection-name', { hasText: 'Small Collection' })
      });
      const loadingSpinner = collectionRow.locator('.animate-spin');
      await expect(loadingSpinner).not.toBeVisible();

      // Verify collection is no longer in loading state
      const loading = await isCollectionLoading(page, 'Small Collection');
      expect(loading).toBe(false);
    });
  });
}
