import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import { closeAllCollections, openCollection, selectEnvironment, sendRequestAndWaitForResponse } from '../../utils/page';

test.describe('Migrate collection from bru to yml format — keep open request tab', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should keep a request tab open during migration functional (no "Request no longer exists")', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const collectionPath = collectionFixturePath!;

    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    await test.step('Open the ping request as a permanent tab', async () => {
      await openCollection(page, 'migration-test');
      await page.locator('.item-name').filter({ hasText: 'ping' }).dblclick();

      const urlContainer = page.locator('#request-url');
      await expect(urlContainer).toBeVisible();
      await expect(urlContainer.locator('.CodeMirror')).toContainText('/ping');
    });

    await test.step('Migrate the collection to yml', async () => {
      await page.locator('#sidebar-collection-name').filter({ hasText: 'migration-test' }).click();

      const overviewTab = page.getByTestId('collection-settings-tab-overview');
      await expect(overviewTab).toBeVisible();
      await overviewTab.click();

      const convertButton = page.getByRole('button', { name: 'Convert to YML' });
      await expect(convertButton).toBeVisible();
      await convertButton.click();

      const modal = page.locator('.bruno-modal').filter({ hasText: 'Migrate to YML format' });
      await modal.waitFor({ state: 'visible', timeout: 5000 });
      await modal.getByRole('button', { name: 'Migrate' }).click();

      await expect(page.getByText('Collection migrated to YML format successfully')).toBeVisible({ timeout: 30000 });
    });

    await test.step('The migrated files exist on disk', async () => {
      expect(fs.existsSync(path.join(collectionPath, 'ping.yml'))).toBe(true);
      expect(fs.existsSync(path.join(collectionPath, 'ping.bru'))).toBe(false);
    });

    await test.step('The ping tab stays open and resolves to the yml request (no "Request no longer exists")', async () => {
      await expect(page.getByText('Request no longer exists')).not.toBeVisible();

      const pingTab = page.locator('.request-tab .tab-label').filter({ hasText: 'ping' });
      await expect(pingTab).toBeVisible({ timeout: 15000 });
      await page.locator('.request-tab').filter({ hasText: 'ping' }).click({ force: true });

      await expect(page.getByText('Request no longer exists')).not.toBeVisible();
      const urlContainer = page.locator('#request-url');
      await expect(urlContainer).toBeVisible();
      await expect(urlContainer.locator('.CodeMirror')).toContainText('/ping');

      await selectEnvironment(page, 'Local');
      await sendRequestAndWaitForResponse(page, 200);
    });

    expect(pageErrors).toHaveLength(0);
  });
});
