import { test, expect, Page } from '../../playwright';

type SettingsScope = 'collection' | 'folder';

const SETTINGS_SAVED_TOASTS: Record<SettingsScope, string> = {
  collection: 'Collection Settings saved successfully',
  folder: 'Folder Settings saved successfully'
};

/**
 * Saves the collection or folder settings pane through the Save button inside that pane.
 * Scoped to the settings content so an open request tab's own Save button can't be matched.
 * @param page - The Playwright page object
 * @param scope - Which settings pane is open
 */
export const saveSettings = async (page: Page, scope: SettingsScope) => {
  await test.step(`Save ${scope} settings`, async () => {
    const content = page.getByTestId(`${scope}-settings-content`);
    await content.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText(SETTINGS_SAVED_TOASTS[scope]).last()).toBeVisible({ timeout: 5000 });
  });
};
