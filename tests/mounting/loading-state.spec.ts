import { test, expect, ElectronApplication, Page } from '../../playwright';
import { setupTestFixture, TestFixture } from '../utils/fixtures';
import { isCollectionLoading, closeAllCollections } from '../utils/page';

const formats = ['bru', 'yml'] as const;

for (const format of formats) {
  test.describe(`[${format}] Loading State`, () => {
    let fixture: TestFixture;
    let app: ElectronApplication;
    let page: Page;

    test.beforeAll(async ({ launchElectronApp }) => {
      // Set up test fixture (collection + user data)
      fixture = await setupTestFixture({
        name: 'Test Collection',
        requestCount: 10,
        depth: 2,
        foldersPerLevel: 2,
        format,
        environmentCount: 2
      });

      // Launch app with the prepared user data
      app = await launchElectronApp({ userDataPath: fixture.userDataPath });
      page = await app.firstWindow();

      // Wait for app to be ready
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
    });

    test.afterAll(async () => {
      // Close collections before app teardown
      if (page) {
        await closeAllCollections(page);
      }

      // Cleanup generated files (app closing is handled by launchElectronApp fixture)
      if (fixture) {
        await fixture.cleanup();
      }
    });

    test('collection should be mounted and visible in sidebar', async () => {
      // Collection should be in the sidebar
      const collectionRow = page.getByTestId('sidebar-collection-row').filter({
        has: page.locator('#sidebar-collection-name', { hasText: 'Test Collection' })
      });
      await expect(collectionRow).toBeVisible({ timeout: 30000 });
    });

    test('mounting spinner should not be visible for loaded collections', async () => {
      const collectionRow = page.getByTestId('sidebar-collection-row').filter({
        has: page.locator('#sidebar-collection-name', { hasText: 'Test Collection' })
      });
      await expect(collectionRow).toBeVisible({ timeout: 30000 });

      // Loading spinner should not be visible
      const loadingSpinner = collectionRow.locator('.animate-spin');
      await expect(loadingSpinner).not.toBeVisible();

      // Verify via helper
      const loading = await isCollectionLoading(page, 'Test Collection');
      expect(loading).toBe(false);
    });
  });
}
