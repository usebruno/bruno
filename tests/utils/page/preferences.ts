import { test, Page } from '../../../playwright';

/**
 * Locators for the Preferences dialog: the status-bar trigger that opens it
 * and the top-level tabs inside it (General, Themes, AI, ...).
 */
export const buildPreferencesLocators = (page: Page) => ({
  /** Status-bar button that opens the Preferences dialog */
  statusBarTrigger: () => page.getByRole('button', { name: 'Open Preferences' }),
  /** A top-level tab inside the Preferences dialog (exact name match) */
  tab: (name: string) => page.getByRole('tab', { name, exact: true }),
  /** General tab — "Enable Auto Save" checkbox */
  enableAutoSaveCheckbox: () => page.getByLabel('Enable Auto Save'),
  /** General tab — "Save Delay (in ms)" input */
  autoSaveIntervalInput: () => page.getByLabel('Save Delay (in ms)'),
  /** The Preferences editor tab (used to close it) */
  preferencesTab: () => page.locator('.request-tab').filter({ hasText: 'Preferences' }),

  /** Locators for the System Proxy panel */
  systemProxy: buildSystemProxyModeLocators(page)

});

const buildSystemProxyModeLocators = (page: Page) => ({
  /** Returns the locator for the System Proxy mode radio button */
  systemProxyMode: () => page.getByRole('radio', { name: 'System Proxy' }),
  /** The "Refresh" button in the System Proxy panel */
  systemProxyRefreshButton: () => page.getByTestId('system-proxy-refresh-button'),
  /** The "Last refreshed at <timestamp>" label in the System Proxy panel */
  systemProxyLastRefreshedLabel: () => page.getByTestId('system-proxy-last-refreshed')
});

/**
 * Open the Preferences dialog via the status bar. Waits for the app to finish
 * loading first so the status bar is interactive.
 */
export const openPreferences = async (page: Page) => {
  await test.step('Open Preferences', async () => {
    const preferences = buildPreferencesLocators(page);
    await page.locator('[data-app-state="loaded"]').waitFor();
    await preferences.statusBarTrigger().click();
  });
};

/**
 * Switch to a top-level tab inside the (already open) Preferences dialog.
 */
export const selectPreferencesTab = async (page: Page, name: string) => {
  await test.step(`Select Preferences tab "${name}"`, async () => {
    const preferences = buildPreferencesLocators(page);
    await preferences.tab(name).click();
  });
};

/**
 * Close the Preferences editor tab, returning focus to the previously active tab.
 */
export const closePreferences = async (page: Page) => {
  await test.step('Close Preferences', async () => {
    const preferences = buildPreferencesLocators(page);
    const tab = preferences.preferencesTab();
    await tab.hover();
    await tab.locator('.close-icon').click({ force: true });
    await tab.waitFor({ state: 'detached' });
  });
};

/**
 * Configure Auto Save from the Preferences → General tab, then close Preferences.
 * Preferences persist through an internal 500ms debounce with no DOM signal, so we
 * wait for it to flush before returning, ensuring the interval is in effect.
 */
export const setAutoSave = async (
  page: Page,
  { enabled = true, intervalMs }: { enabled?: boolean; intervalMs?: number }
) => {
  await test.step(
    `Set Auto Save (enabled=${enabled}${intervalMs != null ? `, interval=${intervalMs}ms` : ''})`,
    async () => {
      const preferences = buildPreferencesLocators(page);
      await openPreferences(page);
      await selectPreferencesTab(page, 'General');

      if (enabled) {
        await preferences.enableAutoSaveCheckbox().check();
      } else {
        await preferences.enableAutoSaveCheckbox().uncheck();
      }

      if (intervalMs != null) {
        await preferences.autoSaveIntervalInput().fill(String(intervalMs));
      }

      // Wait for the 500ms debounce to persist the preference before proceeding.
      await page.waitForTimeout(700);
      await closePreferences(page);
    }
  );
};
