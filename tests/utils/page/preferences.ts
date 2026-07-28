import { test, expect, Page } from '../../../playwright';

/**
 * Locators for the Preferences dialog: the status-bar trigger that opens it
 * and the top-level tabs inside it (General, Themes, AI, ...).
 */
export const buildPreferencesLocators = (page: Page) => ({
  /** Status-bar button that opens the Preferences dialog */
  statusBarTrigger: () => page.getByRole('button', { name: 'Open Preferences' }),
  /** A top-level tab inside the Preferences dialog (exact name match) */
  tab: (name: string) => page.getByRole('tab', { name, exact: true }),
  /** The Preferences request tab (used to close the dialog) */
  requestTab: () => page.locator('.request-tab').filter({ hasText: 'Preferences' }),

  /** Locators on the General panel */
  general: {
    autoSaveEnabled: () => page.locator('#autoSaveEnabled'),
    autoSaveInterval: () => page.locator('#autoSaveInterval'),
    /** The "Request Timeout (in ms)" field on the General tab */
    requestTimeoutInput: () => page.locator('input[name="timeout"]')
  },
  /** The open Preferences tab in the tab bar */
  openTab: () => page.locator('.request-tab').filter({ hasText: 'Preferences' }),
  /** Close control on the open Preferences tab */
  openTabCloseIcon: () => page.locator('.request-tab').filter({ hasText: 'Preferences' }).locator('.close-icon'),

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
 * Close the (open) Preferences dialog by closing its request tab.
 */
export const closePreferences = async (page: Page) => {
  await test.step('Close Preferences', async () => {
    const preferences = buildPreferencesLocators(page);
    const tab = preferences.requestTab();
    await tab.hover();
    await tab.locator('.close-icon').click({ force: true });
  });
};

/**
 * Toggle Auto Save in Preferences (and optionally set the save-delay interval).
 * Opens Preferences, applies the change on the General tab, waits for the
 * preferences form to persist (500ms debounce), then closes the dialog.
 * @param options.enabled - Whether Auto Save should be on
 * @param options.intervalMs - Save delay in ms (min 500); only applied when enabling
 */
export const setAutoSave = async (
  page: Page,
  { enabled, intervalMs }: { enabled: boolean; intervalMs?: number }
) => {
  await test.step(`Set Auto Save ${enabled ? `on${intervalMs !== undefined ? ` (${intervalMs}ms)` : ''}` : 'off'}`, async () => {
    const preferences = buildPreferencesLocators(page);
    await openPreferences(page);
    await selectPreferencesTab(page, 'General');

    if (enabled) {
      await preferences.general.autoSaveEnabled().check();
      if (intervalMs !== undefined) {
        await preferences.general.autoSaveInterval().fill(String(intervalMs));
      }
    } else {
      await preferences.general.autoSaveEnabled().uncheck();
    }

    // The preferences form persists on a 500ms debounce.
    await page.waitForTimeout(800);
    await closePreferences(page);
  });
};

/* Set the global "Request Timeout (in ms)" preference (General tab) that a
 * request with timeout="inherit" falls back to. Closing the Preferences tab
 * unmounts the form, which flushes its debounced save.
 */
export const setRequestTimeoutPreference = async (page: Page, value: string) => {
  await test.step(`Set global request timeout preference to ${value}ms`, async () => {
    const preferences = buildPreferencesLocators(page);
    await openPreferences(page);
    await selectPreferencesTab(page, 'General');
    await preferences.general.requestTimeoutInput().fill(value);
    // Wait for the value to commit before closing so the debounced save flushes the new value on unmount
    await expect(preferences.general.requestTimeoutInput()).toHaveValue(value, { timeout: 5000 });
    await preferences.openTab().hover();
    await preferences.openTabCloseIcon().click({ force: true });
    await preferences.openTab().waitFor({ state: 'detached' });
  });
};
