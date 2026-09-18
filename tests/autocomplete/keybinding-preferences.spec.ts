import { test, expect, Page } from '../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  openRequest,
  openPreferences,
  selectPreferencesTab,
  closePreferences,
  buildCommonLocators
} from '../utils/page';
import { buildAutocompleteLocators, pressAutocompleteShortcut, setEditorState } from '../utils/page/autocomplete';

const ACTION = 'triggerAutocomplete';
const NEW_COMBO_KEYS = ['Control', 'Shift', 'Space'];

/** Press-and-release Ctrl+Shift+Space, used both to record the new binding in the
 * Keybindings editor and, later, to invoke the shortcut itself once rebound. */
const pressCtrlShiftSpace = async (page: Page) => {
  for (const key of NEW_COMBO_KEYS) {
    await page.keyboard.down(key);
  }
  for (const key of [...NEW_COMBO_KEYS].reverse()) {
    await page.keyboard.up(key);
  }
};

const resetTriggerAutocompleteBinding = async (page: Page) => {
  await openPreferences(page);
  await selectPreferencesTab(page, 'Keybindings');
  const resetButton = page.getByTestId(`keybinding-reset-${ACTION}`);
  if (await resetButton.isVisible().catch(() => false)) {
    await resetButton.click();
  }
  await closePreferences(page);
};

test.describe('Variable autocomplete — keybinding preferences', () => {
  test.afterEach(async ({ page }) => {
    await resetTriggerAutocompleteBinding(page);
    await closeAllCollections(page);
  });

  test('rebinding "Trigger Autocomplete" changes which key combo opens the dropdown', async ({ page, createTmpDir }) => {
    const COLLECTION_NAME = 'autocomplete-keybinding-prefs';
    const REQUEST_NAME = 'req';

    await createCollection(page, COLLECTION_NAME, await createTmpDir());
    await createRequest(page, REQUEST_NAME, COLLECTION_NAME, { url: 'https://example.com/api' });
    await openRequest(page, COLLECTION_NAME, REQUEST_NAME);

    const urlEditor = buildCommonLocators(page).request.urlInput();
    const { widget } = buildAutocompleteLocators(page);

    await test.step('the default Ctrl+Space shortcut opens the dropdown before any rebinding', async () => {
      await urlEditor.click();
      await setEditorState(urlEditor, 'https://example.com/api', 23);
      await pressAutocompleteShortcut(page);
      await expect(widget()).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(widget()).toHaveCount(0);
    });

    await test.step('rebind "Trigger Autocomplete" to Ctrl+Shift+Space in Preferences', async () => {
      await openPreferences(page);
      await selectPreferencesTab(page, 'Keybindings');

      await page.getByTestId(`keybinding-row-${ACTION}`).click();
      await expect(page.getByTestId(`keybinding-input-${ACTION}`)).toHaveClass(/shortcut-input--editing/);

      await pressCtrlShiftSpace(page);

      // Commits immediately on keyup; the editing state clears and no error is shown.
      await expect(page.getByTestId(`keybinding-input-${ACTION}`)).not.toHaveClass(/shortcut-input--editing/);
      await expect(page.getByTestId(`keybinding-input-${ACTION}`)).not.toHaveClass(/shortcut-input--error/);

      await closePreferences(page);
    });

    await test.step('the old Ctrl+Space combo no longer opens the dropdown', async () => {
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await urlEditor.click();
      await setEditorState(urlEditor, 'https://example.com/api', 23);
      await pressAutocompleteShortcut(page);
      await page.waitForTimeout(300);
      await expect(widget()).toHaveCount(0);
    });

    await test.step('the new Ctrl+Shift+Space combo opens the dropdown', async () => {
      await urlEditor.click();
      await setEditorState(urlEditor, 'https://example.com/api', 23);
      await pressCtrlShiftSpace(page);
      await expect(widget()).toBeVisible();
      await page.keyboard.press('Escape');
    });
  });
});
