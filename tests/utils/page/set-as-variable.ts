import { expect, Locator, Page, test } from '../../../playwright';

export const buildSetAsVariableLocators = (page: Page) => ({
  menu: () => page.getByTestId('set-as-variable-menu-dropdown'),
  menuAction: () => page.getByTestId('set-as-variable-menu-new'),
  popover: () => page.getByTestId('set-as-variable-popover'),
  value: () => page.getByTestId('set-as-variable-value'),
  copyButton: () => page.getByTestId('set-as-variable-copy'),
  scopeBadge: () => page.getByTestId('set-as-variable-scope-badge'),
  nameInput: () => page.getByTestId('set-as-variable-name'),
  nameError: () => page.getByTestId('set-as-variable-name-error'),
  addToToggle: () => page.getByTestId('set-as-variable-add-to-toggle'),
  scopeList: () => page.getByTestId('set-as-variable-scopes'),
  scopeOption: (scopeType: string) => page.getByTestId(`set-as-variable-scope-${scopeType}`),
  secretCheckbox: () => page.getByTestId('set-as-variable-secret'),
  createEnvLink: (scopeType: string) => page.getByTestId(`set-as-variable-create-env-${scopeType}`),
  createEnvName: () => page.getByTestId('set-as-variable-create-env-name'),
  createEnvSubmit: () => page.getByTestId('set-as-variable-create-env-submit'),
  createEnvError: () => page.getByTestId('set-as-variable-create-env-error'),
  saveButton: () => page.getByTestId('set-as-variable-save'),
  cancelButton: () => page.getByTestId('set-as-variable-cancel')
});

// Chromium coalesces clicks at the same point within its double-click interval. Without a pause
// the right-click counts as a third click, which CodeMirror treats as "select the whole line" —
// the menu still opens, but over the entire line rather than the double-clicked word.
const DOUBLE_CLICK_RESET_MS = 600;

/**
 * Double-clicks to select the word under the pointer, then right-clicks the exact same point.
 * The feature only opens its menu when the right-click lands inside the selection (mirroring
 * CodeMirror's own `resetSelectionOnContextMenu`), so both events must share coordinates.
 */
const selectWordAndRightClick = async (page: Page, target: Locator, offsetX = 12) => {
  await expect(target).toBeVisible();

  const box = await target.boundingBox();
  if (!box) {
    throw new Error('Cannot select text: target has no bounding box');
  }

  const x = box.x + offsetX;
  const y = box.y + box.height / 2;

  await page.mouse.dblclick(x, y);
  await page.waitForTimeout(DOUBLE_CLICK_RESET_MS);
  await page.mouse.click(x, y, { button: 'right' });
};

/** Right-clicks a selected word and returns the "Set as variable" menu. */
const openSetAsVariableMenu = async (page: Page, target: Locator, offsetX?: number): Promise<Locator> => {
  const setAsVariable = buildSetAsVariableLocators(page);
  await selectWordAndRightClick(page, target, offsetX);

  const menu = setAsVariable.menu();
  await expect(menu).toBeVisible();
  return menu;
};

/** Right-clicks a selected word and opens the "Set as new variable" form. */
const openSetAsVariablePopover = async (page: Page, target: Locator, offsetX?: number): Promise<Locator> => {
  const setAsVariable = buildSetAsVariableLocators(page);

  return test.step('Open the Set as variable form', async () => {
    await openSetAsVariableMenu(page, target, offsetX);
    await setAsVariable.menuAction().click();

    const popover = setAsVariable.popover();
    await expect(popover).toBeVisible();
    return popover;
  });
};

/** Picks a scope from the collapsed "Add to" list. */
const selectVariableScope = async (page: Page, scopeType: string) => {
  const setAsVariable = buildSetAsVariableLocators(page);

  await test.step(`Select the ${scopeType} scope`, async () => {
    await setAsVariable.addToToggle().click();
    await expect(setAsVariable.scopeList()).toBeVisible();
    await setAsVariable.scopeOption(scopeType).click();
  });
};

export { openSetAsVariableMenu, openSetAsVariablePopover, selectVariableScope, selectWordAndRightClick };
