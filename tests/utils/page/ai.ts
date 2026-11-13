import { test, expect, Page } from '../../../playwright';
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
    page.locator('.autocomplete-keymap').getByText(label, { exact: true }),
  /** The GitHub Copilot provider card on the Config sub-tab */
  copilot: {
    card: () => page.getByTestId('ai-provider-github-copilot'),
    /** The card header that expands or collapses the card */
    header: () => page.getByTestId('ai-provider-github-copilot-header'),
    /** The on/off switch input in the card header */
    providerSwitch: () => page.getByTestId('ai-provider-github-copilot-toggle').locator('input[type="checkbox"]'),
    signInButton: () => page.getByTestId('ai-copilot-sign-in'),
    useGitHubCliButton: () => page.getByTestId('ai-copilot-use-github-cli'),
    /** The one-time code shown while waiting for approval on GitHub */
    userCode: () => page.getByTestId('ai-copilot-user-code'),
    cancelSignInButton: () => page.getByTestId('ai-copilot-cancel-sign-in'),
    account: () => page.getByTestId('ai-copilot-account'),
    /** The error shown inside the Copilot card */
    error: () => page.getByTestId('ai-provider-github-copilot').getByRole('alert')
  }
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

/**
 * Expand the GitHub Copilot provider card if it is collapsed.
 */
export const expandCopilotCard = async (page: Page) => {
  await test.step('Expand the GitHub Copilot card', async () => {
    const header = buildAiPreferencesLocators(page).copilot.header();
    if ((await header.getAttribute('aria-expanded')) !== 'true') {
      await header.click();
    }
    await expect(header).toHaveAttribute('aria-expanded', 'true');
  });
};
