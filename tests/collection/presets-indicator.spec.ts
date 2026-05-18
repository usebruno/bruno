import type { Locator } from '@playwright/test';
import { test, expect } from '../../playwright';
import { closeAllCollections, createCollection } from '../utils/page';

test.describe('Presets status dot in collection settings', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Presets dot appears only when request type is non-http or request URL is set', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'test-presets-indicator';
    let presetsTab: Locator;

    await test.step('Create a fresh collection (opens collection settings tab)', async () => {
      await createCollection(page, collectionName, await createTmpDir());
    });

    await test.step('Open the Presets sub-tab', async () => {
      presetsTab = page.getByTestId('collection-settings-tab-presets');
      // visibility of the Presets sub-tab implies the collection settings tab is open
      await expect(presetsTab).toBeVisible();
      await presetsTab.click();
    });

    await test.step('Verify default state: HTTP selected and request URL is empty', async () => {
      await expect(page.locator('input#http')).toBeChecked();
      await expect(page.locator('input#graphql')).not.toBeChecked();
      await expect(page.locator('input#grpc')).not.toBeChecked();
      await expect(page.locator('input#ws')).not.toBeChecked();
      await expect(page.locator('input#request-url')).toHaveValue('');
    });

    await test.step('Verify Presets dot is NOT visible when HTTP is selected and URL is empty', async () => {
      await expect(presetsTab.locator('sup')).toHaveCount(0);
    });

    await test.step('Select GraphQL request type and save', async () => {
      await page.locator('input#graphql').check();
      await page.getByRole('button', { name: 'Save' }).click();
    });

    // Non-default = anything other than HTTP (the default request type). Here: GraphQL, with the URL still empty —
    // so the dot must appear purely because the request type is non-default.
    await test.step('Verify Presets dot appears when a non-default request type is selected', async () => {
      await expect(presetsTab.locator('sup')).toHaveCount(1);
    });

    await test.step('Switch back to HTTP and set a request URL, then save', async () => {
      await page.locator('input#http').check();
      await page.locator('input#request-url').fill('https://example.com');
      await page.getByRole('button', { name: 'Save' }).click();
    });

    await test.step('Verify Presets dot remains visible when request URL is set', async () => {
      await expect(presetsTab.locator('sup')).toHaveCount(1);
    });

    await test.step('Clear the request URL with HTTP selected, then save', async () => {
      await page.locator('input#request-url').fill('');
      await expect(page.locator('input#http')).toBeChecked();
      await page.getByRole('button', { name: 'Save' }).click();
    });

    await test.step('Verify Presets dot disappears when state returns to defaults', async () => {
      await expect(presetsTab.locator('sup')).toHaveCount(0);
    });
  });
});
