import { test, expect } from '../../../playwright';
import { createCollection, closeAllCollections, createRequest } from '../../utils/page';

test.describe('Autosave', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should automatically save request changes when autosave is enabled', async ({ page, createTmpDir }) => {
    const collectionName = 'autosave-test';

    await test.step('Create collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir('autosave-collection'), {
        openWithSandboxMode: 'safe'
      });
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
      // Open preferences
      await page.locator('.status-bar button[data-trigger="preferences"]').click();

      const preferencesModal = page.locator('.bruno-modal-card').filter({ hasText: 'Preferences' });
      await expect(preferencesModal).toBeVisible();

      // Enable autosave checkbox
      const autoSaveCheckbox = preferencesModal.locator('#autoSaveEnabled');
      await autoSaveCheckbox.check();

      // Save preferences
      await preferencesModal.locator('button[type="submit"]').click();

      // Wait for preferences to close
      await expect(preferencesModal).not.toBeVisible();
    });

    await test.step('Make changes and verify autosave', async () => {
      // Make a change to the URL
      const urlEditor = page.locator('#request-url .CodeMirror');
      await urlEditor.click();
      await page.keyboard.press('End');
      await page.keyboard.type('/users');

      // Verify draft indicator appears
      const requestTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Test Request' }) });
      await expect(requestTab.locator('.has-changes-icon')).toBeVisible();

      // Wait for autosave to trigger (interval + some buffer)
      await page.waitForTimeout(1000);

      // Verify draft indicator disappears after autosave
      await expect(requestTab.locator('.has-changes-icon')).not.toBeVisible();
    });

    await test.step('Verify changes persisted', async () => {
      // Close and reopen the request tab to verify persistence
      const requestTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Test Request' }) });
      await requestTab.locator('.close-icon').click();

      // Reopen request
      await page.locator('.collection-item-name').filter({ hasText: 'Test Request' }).click();

      // Verify URL contains our changes
      const urlEditor = page.locator('#request-url .CodeMirror');
      const urlContent = await urlEditor.locator('.CodeMirror-line').first().textContent();
      expect(urlContent).toContain('api.example.com/users');
    });

    await test.step('Disable autosave in preferences', async () => {
      // Open preferences from status bar
      await page.locator('.status-bar button[data-trigger="preferences"]').click();

      // Wait for preferences modal
      const preferencesModal = page.locator('.bruno-modal-card').filter({ hasText: 'Preferences' });
      await expect(preferencesModal).toBeVisible();

      // Disable autosave checkbox
      const autoSaveCheckbox = preferencesModal.locator('#autoSaveEnabled');
      await autoSaveCheckbox.uncheck();

      // Save preferences
      await preferencesModal.locator('button[type="submit"]').click();

      // Wait for preferences to close
      await expect(preferencesModal).not.toBeVisible();
    });

    await test.step('Make changes and verify no autosave when disabled', async () => {
      // Make a change to the URL
      const urlEditor = page.locator('#request-url .CodeMirror');
      await urlEditor.click();
      await page.keyboard.press('End');
      await page.keyboard.type('/posts');

      // Verify draft indicator appears
      const requestTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Test Request' }) });
      await expect(requestTab.locator('.has-changes-icon')).toBeVisible();

      // Wait a bit (longer than autosave interval would be)
      await page.waitForTimeout(1500);

      // Draft indicator should still be visible (autosave is disabled)
      await expect(requestTab.locator('.has-changes-icon')).toBeVisible();

      // Save the request
      await page.keyboard.press('Control+s');
      await expect(requestTab.locator('.has-changes-icon')).not.toBeVisible();
    });
  });

  test('should autosave existing drafts when autosave is enabled', async ({ page, createTmpDir }) => {
    const collectionName = 'autosave-existing-drafts-test';

    await test.step('Create collection and request with initial URL', async () => {
      await createCollection(page, collectionName, await createTmpDir('autosave-existing-drafts-collection'), {
        openWithSandboxMode: 'safe'
      });
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

      // Verify draft indicator appears
      const requestTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Draft Request' }) });
      await expect(requestTab.locator('.has-changes-icon')).toBeVisible();
    });

    await test.step('Enable autosave and verify existing draft is saved', async () => {
      // Open preferences
      await page.locator('.status-bar button[data-trigger="preferences"]').click();

      const preferencesModal = page.locator('.bruno-modal-card').filter({ hasText: 'Preferences' });
      await expect(preferencesModal).toBeVisible();

      // Enable autosave checkbox
      const autoSaveCheckbox = preferencesModal.locator('#autoSaveEnabled');
      await autoSaveCheckbox.check();

      // Save preferences
      await preferencesModal.locator('button[type="submit"]').click();

      // Wait for preferences to close
      await expect(preferencesModal).not.toBeVisible();

      // Wait for autosave to trigger for existing draft
      await page.waitForTimeout(1000);

      // Verify draft indicator disappears (existing draft was auto-saved)
      const requestTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Draft Request' }) });
      await expect(requestTab.locator('.has-changes-icon')).not.toBeVisible();
    });

    await test.step('Verify changes persisted', async () => {
      // Close and reopen the request tab to verify persistence
      const requestTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Draft Request' }) });
      await requestTab.locator('.close-icon').click();

      // Reopen request
      await page.locator('.collection-item-name').filter({ hasText: 'Draft Request' }).click();

      // Verify URL contains our changes
      const urlEditor = page.locator('#request-url .CodeMirror');
      const urlContent = await urlEditor.locator('.CodeMirror-line').first().textContent();
      expect(urlContent).toContain('api.example.com/existing-draft');
    });
  });
});
