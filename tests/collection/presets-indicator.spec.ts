import type { Locator } from '@playwright/test';
import { test, expect } from '../../playwright';
import { buildCommonLocators, closeAllCollections, createCollection } from '../utils/page';

test.describe('Presets status dot in collection settings', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Presets dot is hidden on a fresh collection and stays visible once a preset has been saved (even at defaults)', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'test-presets-indicator';
    const locators = buildCommonLocators(page);
    let presetsTab: Locator;

    await test.step('Create a fresh collection (opens collection settings tab)', async () => {
      await createCollection(page, collectionName, await createTmpDir());
    });

    await test.step('Open the Presets sub-tab', async () => {
      presetsTab = locators.paneTabs.collectionSettingsTab('presets');
      // visibility of the Presets sub-tab implies the collection settings tab is open
      await expect(presetsTab).toBeVisible();
      await presetsTab.click();
    });

    await test.step('Verify default state: HTTP selected and request URL is empty', async () => {
      await expect(locators.presets.requestType('http')).toBeChecked();
      await expect(locators.presets.requestType('graphql')).not.toBeChecked();
      await expect(locators.presets.requestType('grpc')).not.toBeChecked();
      await expect(locators.presets.requestType('ws')).not.toBeChecked();
      await expect(locators.presets.requestUrl()).toHaveValue('');
    });

    await test.step('Verify Presets dot is NOT visible when HTTP is selected and URL is empty', async () => {
      await expect(presetsTab.getByTestId('status-dot')).toBeHidden();
    });

    await test.step('Select gRPC request type and save', async () => {
      await locators.presets.requestType('grpc').check();
      await locators.presets.saveBtn().click();
    });

    await test.step('Verify Presets dot appears when a non-default request type is selected', async () => {
      await expect(presetsTab.getByTestId('status-dot')).toBeVisible();
    });

    await test.step('Switch back to HTTP and set a request URL, then save', async () => {
      await locators.presets.requestType('http').check();
      await locators.presets.requestUrl().fill('https://example.com');
      await locators.presets.saveBtn().click();
    });

    await test.step('Verify Presets dot remains visible when request URL is set', async () => {
      await expect(presetsTab.getByTestId('status-dot')).toBeVisible();
    });

    await test.step('Clear the request URL with HTTP selected, then save (returns to default values)', async () => {
      await locators.presets.requestUrl().fill('');
      await expect(locators.presets.requestType('http')).toBeChecked();
      await locators.presets.saveBtn().click();
    });

    await test.step('Verify Presets dot is hidden after returning to defaults', async () => {
      await expect(presetsTab.getByTestId('status-dot')).not.toBeVisible({ timeout: 5000 });
    });
  });
});
