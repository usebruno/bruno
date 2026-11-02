import { test, expect } from '@e2e/test';
import { buildCommonLocators, openAiPreferences } from '@e2e/pages';

const expectedModifier = process.platform === 'darwin' ? '⌘' : 'Ctrl';

test.describe('AI shortcut hints', () => {
  test('autocomplete keymap shows the platform-correct modifier', async ({ pageWithUserData: page }) => {
    const { ai } = buildCommonLocators(page);

    await openAiPreferences(page, 'autocomplete');

    await expect(ai.autocompleteKeymap()).toBeVisible();
    await expect(ai.autocompleteKeymapKey(expectedModifier).first()).toBeVisible();
  });
});
