import { test, Page } from '../../../playwright';
import { openPreferences, selectPreferencesTab } from './preferences';

export type AiPreferencesSubTab = 'config' | 'autocomplete' | 'security';

/**
 * Locators for the AI pane of the Preferences dialog: its sub-tabs
 * (Config / Autocomplete / Security) and the autocomplete keymap hints.
 */
export const buildAiPreferencesLocators = (page: Page) => ({
  /** A sub-tab inside the AI preferences pane */
  subTab: (key: AiPreferencesSubTab) => page.getByTestId(`ai-tab-${key}`),
  /** The keyboard-shortcut hint block on the Autocomplete sub-tab */
  autocompleteKeymap: () => page.locator('.autocomplete-keymap'),
  /** A single key label inside the autocomplete keymap (exact match) */
  autocompleteKeymapKey: (label: string) =>
    page.locator('.autocomplete-keymap').getByText(label, { exact: true })
});

/**
 * Open the AI pane of the Preferences dialog, optionally landing on a
 * specific sub-tab.
 */
export const openAiPreferences = async (page: Page, subTab?: AiPreferencesSubTab) => {
  await test.step(`Open AI preferences${subTab ? ` ("${subTab}" sub-tab)` : ''}`, async () => {
    await openPreferences(page);
    await selectPreferencesTab(page, 'AI');
    if (subTab) {
      await buildAiPreferencesLocators(page).subTab(subTab).click();
    }
  });
};
