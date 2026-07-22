import { test, expect } from '../../../playwright';
import { buildCommonLocators, openAiPreferences } from '../../utils/page';

const expectedModifier = process.platform === 'darwin' ? '⌘' : 'Ctrl';

test.describe('AI shortcut hints', () => {
  test('autocomplete keymap shows the platform-correct modifier', async ({ pageWithUserData: page }) => {
    const { ai } = buildCommonLocators(page);

    await openAiPreferences(page, 'autocomplete');

    await expect(ai.autocompleteKeymap()).toBeVisible();
    await expect(ai.autocompleteKeymapKey(expectedModifier).first()).toBeVisible();
  });
});
