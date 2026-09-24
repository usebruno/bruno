import { test, expect } from '../../../playwright';
import { closeAllCollections, openCollection } from '../../utils/page';

const DISMISSED_LOCAL_STORAGE_KEY = 'bruno.migrateToYmlPill.dismissed';

test.describe('Migrate-to-YML pill in collection toolbar', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should show the pill for bru collections, open settings on click, and persist dismissal', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    const collectionPath = collectionFixturePath!;

    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    await test.step('Clear any prior dismissal state for this collection', async () => {
      await page.evaluate((key) => {
        localStorage.removeItem(key);
      }, DISMISSED_LOCAL_STORAGE_KEY);
    });

    await test.step('Open the bru collection', async () => {
      await openCollection(page, 'migration-test');
    });

    const pill = page.getByTestId('migrate-yml-pill');
    const pillDismiss = page.getByTestId('migrate-yml-pill-dismiss');

    await test.step('Pill is visible in the collection toolbar with the expected label and dismiss icon', async () => {
      await expect(pill).toBeVisible({ timeout: 10000 });
      await expect(pill).toContainText('Migrate to YML');
      await expect(pillDismiss).toBeVisible();
    });

    await test.step('Clicking the pill body opens the migrate-to-yml modal without dismissing', async () => {
      await pill.click();
      const migrateModal = page.locator('.bruno-modal-card', { hasText: 'Migrate to YML format' });
      await expect(migrateModal).toBeVisible();
      // Pill should still be visible — clicking the body opens the modal, it should not dismiss
      await expect(pill).toBeVisible();
      // Close the modal so the next step can interact with the pill
      await page.keyboard.press('Escape');
      await expect(page.locator('.bruno-modal-backdrop')).toHaveCount(0);
    });

    await test.step('Dismiss the pill via the cross icon', async () => {
      await pillDismiss.click();
      await expect(pill).toBeHidden();
    });

    await test.step('Dismissal is persisted to localStorage keyed by collection pathname', async () => {
      const stored = await page.evaluate(
        (key) => localStorage.getItem(key),
        DISMISSED_LOCAL_STORAGE_KEY
      );
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(Array.isArray(parsed)).toBe(true);

      // collection.pathname is stored as-is; normalise separators for the cross-platform check
      const normalisedStored = parsed.map((p: string) => p.replace(/\\/g, '/'));
      const normalisedCollectionPath = collectionPath.replace(/\\/g, '/');
      expect(normalisedStored).toContain(normalisedCollectionPath);
    });

    await test.step('Pill stays hidden when switching between collection settings tabs', async () => {
      await page.getByTestId('collection-settings-tab-headers').click();
      await expect(pill).toBeHidden();
      await page.getByTestId('collection-settings-tab-overview').click();
      await expect(pill).toBeHidden();
    });

    expect(pageErrors).toHaveLength(0);
  });
});
