import { test, expect } from '../../../playwright';
import { createCollection, closeAllCollections, createRequest } from '../../utils/page';

test.describe('Autosave', () => {
  test.setTimeout(60000);

  test.afterEach(async ({ page }) => {
    // Only try to cleanup if page is still open
    if (!page.isClosed()) {
      await closeAllCollections(page);
    }
  });

  test('should automatically save request changes when autosave is enabled', async ({ page, createTmpDir }) => {
    const collectionName = 'autosave-test';

    await test.step('Create collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir('autosave-collection'));
      await expect(page.locator('#sidebar-collection-name').filter({ hasText: collectionName })).toBeVisible();

      await createRequest(page, 'Test Request', collectionName);
      await page.locator('.collection-item-name').filter({ hasText: 'Test Request' }).click();

      // Set initial URL and save
      const urlEditor = page.locator('#request-url .CodeMirror');
      await urlEditor.click();
      await page.keyboard.type('https://api.example.com');
      await page.keyboard.press('Control+s');

      // Verify no draft indicator
      const requestTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Test Request' }) });
      await expect(requestTab.locator('.has-changes-icon')).not.toBeVisible();
    });

    await test.step('Enable autosave in preferences', async () => {
      // Open preferences tab
      await page.locator('.status-bar button[data-trigger="preferences"]').click();

      // Wait for preferences tab to be visible
      await page.waitForTimeout(500);

      // Navigate to General tab (should be default, but ensure it)
      await page.getByRole('tab', { name: 'General' }).click();

      // Enable autosave checkbox
      const autoSaveCheckbox = page.locator('#autoSaveEnabled');
      await autoSaveCheckbox.check();

      // Wait for auto-save to complete (debounce is 500ms)
      await page.waitForTimeout(1000);

      // Close preferences tab using the close icon
      const preferencesTab = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      await preferencesTab.hover();
      await preferencesTab.locator('.close-icon').click();

      // Click on the request to make it active again
      await page.locator('.collection-item-name').filter({ hasText: 'Test Request' }).click();
    });

    await test.step('Make changes and verify autosave', async () => {
      // Make a change to the URL
      const urlEditor = page.locator('#request-url .CodeMirror');
      await urlEditor.click();
      await page.keyboard.press('End');
      await page.keyboard.type('/users');

      // Wait for draft indicator to appear (change registered)
      const requestTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Test Request' }) });
      await expect(requestTab.locator('.has-changes-icon')).toBeVisible();

      // Wait for autosave to complete (draft indicator disappears)
      await expect(requestTab.locator('.has-changes-icon')).not.toBeVisible({ timeout: 5000 });
    });

    await test.step('Verify changes persisted', async () => {
      // Close and reopen the request tab to verify persistence
      const requestTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Test Request' }) });
      await requestTab.hover();
      await requestTab.getByTestId('request-tab-close-icon').click();

      // Reopen request
      await page.locator('.collection-item-name').filter({ hasText: 'Test Request' }).click();

      // Verify URL contains our changes
      const urlEditor = page.locator('#request-url .CodeMirror');
      const urlContent = await urlEditor.locator('.CodeMirror-line').first().textContent();
      expect(urlContent).toContain('api.example.com/users');
    });

    await test.step('Disable autosave in preferences', async () => {
      // Open preferences tab
      await page.locator('.status-bar button[data-trigger="preferences"]').click();

      // Wait for preferences tab to be visible
      await page.waitForTimeout(500);

      // Navigate to General tab
      await page.getByRole('tab', { name: 'General' }).click();

      // Disable autosave checkbox
      const autoSaveCheckbox = page.locator('#autoSaveEnabled');
      await autoSaveCheckbox.uncheck();

      // Wait for auto-save to complete (debounce is 500ms)
      await page.waitForTimeout(1000);

      // Close preferences tab using the close icon
      const preferencesTab = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      await preferencesTab.hover();
      await preferencesTab.locator('.close-icon').click();

      // Click on the request to make it active again
      await page.locator('.collection-item-name').filter({ hasText: 'Test Request' }).click();
    });

    await test.step('Make changes and verify no autosave when disabled', async () => {
      // Make a change to the URL
      const urlEditor = page.locator('#request-url .CodeMirror');
      await urlEditor.click();
      await page.keyboard.press('End');
      await page.keyboard.type('/posts');

      // Move mouse away from tab to ensure draft icon is visible (hover shows close icon)
      await page.mouse.move(0, 0);

      // Verify draft indicator appears
      const requestTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Test Request' }) });
      await expect(requestTab.locator('.has-changes-icon')).toBeVisible();

      await expect(requestTab.locator('.has-changes-icon')).toBeVisible({ timeout: 2000 });

      // Save the request
      await page.keyboard.press('Control+s');
      await expect(requestTab.locator('.has-changes-icon')).not.toBeVisible();
    });
  });

  test('should autosave existing drafts when autosave is enabled', async ({ page, createTmpDir }) => {
    const collectionName = 'autosave-existing-drafts-test';

    await test.step('Create collection and request with initial URL', async () => {
      await createCollection(page, collectionName, await createTmpDir('autosave-existing-drafts-collection'));
      await expect(page.locator('#sidebar-collection-name').filter({ hasText: collectionName })).toBeVisible();

      await createRequest(page, 'Draft Request', collectionName);
      await page.locator('.collection-item-name').filter({ hasText: 'Draft Request' }).click();

      // Set initial URL and save
      const urlEditor = page.locator('#request-url .CodeMirror');
      await urlEditor.click();
      await page.keyboard.type('https://api.example.com');
      await page.keyboard.press('Control+s');

      // Verify no draft indicator
      const requestTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Draft Request' }) });
      await expect(requestTab.locator('.has-changes-icon')).not.toBeVisible();
    });

    await test.step('Make changes to create a draft (without saving)', async () => {
      // Make a change to the URL
      const urlEditor = page.locator('#request-url .CodeMirror');
      await urlEditor.click();
      await page.keyboard.press('End');
      await page.keyboard.type('/existing-draft');

      // Move mouse away from tab to ensure draft icon is visible (hover shows close icon)
      await page.mouse.move(0, 0);

      // Verify draft indicator appears
      const requestTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Draft Request' }) });
      await expect(requestTab.locator('.has-changes-icon')).toBeVisible();
    });

    await test.step('Enable autosave and verify existing draft is saved', async () => {
      // Open preferences tab
      await page.locator('.status-bar button[data-trigger="preferences"]').click();

      // Wait for preferences tab to be visible
      await page.waitForTimeout(500);

      // Navigate to General tab
      await page.getByRole('tab', { name: 'General' }).click();

      // Enable autosave checkbox
      const autoSaveCheckbox = page.locator('#autoSaveEnabled');
      await autoSaveCheckbox.check();

      // Wait for auto-save to complete (debounce is 500ms)
      await page.waitForTimeout(1000);

      // Close preferences tab using the close icon
      const preferencesTab = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      await preferencesTab.hover();
      await preferencesTab.locator('.close-icon').click();

      // Click on the request to make it active again
      await page.locator('.collection-item-name').filter({ hasText: 'Draft Request' }).click();

      await page.waitForTimeout(1000);

      const requestTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Draft Request' }) });
      await expect(requestTab.locator('.has-changes-icon')).not.toBeVisible({ timeout: 10000 });
    });

    await test.step('Verify changes persisted', async () => {
      // Close and reopen the request tab to verify persistence
      const requestTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Draft Request' }) });
      await requestTab.hover();
      await requestTab.getByTestId('request-tab-close-icon').click();

      // Reopen request
      await page.locator('.collection-item-name').filter({ hasText: 'Draft Request' }).click();

      // Verify URL contains our changes
      const urlEditor = page.locator('#request-url .CodeMirror');
      const urlContent = await urlEditor.locator('.CodeMirror-line').first().textContent();
      expect(urlContent).toContain('api.example.com/existing-draft');
    });
  });
});
