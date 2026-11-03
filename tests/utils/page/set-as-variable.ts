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
  createEnvLink: (scopeType: string) => page.getByTestId(`set-as-variable-create-env-link-${scopeType}`),
  createEnvName: (scopeType: string) => page.getByTestId(`set-as-variable-create-env-input-${scopeType}`),
  createEnvSubmit: (scopeType: string) => page.getByTestId(`set-as-variable-create-env-submit-${scopeType}`),
  createEnvError: (scopeType: string) => page.getByTestId(`set-as-variable-create-env-error-${scopeType}`),
  saveButton: () => page.getByTestId('set-as-variable-save'),
  cancelButton: () => page.getByTestId('set-as-variable-cancel')
});

// Without a pause Chromium counts the right-click as a third click, so CodeMirror selects the line.
const DOUBLE_CLICK_RESET_MS = 600;

/** Double-clicks the word under the pointer, then right-clicks that same point. */
const selectWordAndRightClick = async (page: Page, target: Locator, offsetX = 12) => {
  let box: Awaited<ReturnType<Locator['boundingBox']>> = null;
  await expect(async () => {
    box = await target.boundingBox();
    expect(box).not.toBeNull();
  }).toPass();

  const x = box!.x + offsetX;
  const y = box!.y + box!.height / 2;

  await page.mouse.dblclick(x, y);

  await expect(page.locator('.CodeMirror-selected').first()).toBeVisible();

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

/** Opens the form over the word at a character index, via CodeMirror's `charCoords`. */
const openSetAsVariablePopoverAtChar = async (
  page: Page,
  editorTestId: string,
  ch: number,
  line = 0
): Promise<Locator> => {
  const setAsVariable = buildSetAsVariableLocators(page);

  const point = await page
    .getByTestId(editorTestId)
    .locator('.CodeMirror')
    .first()
    .evaluate((el: any, { ch: index, line: lineIndex }: { ch: number; line: number }) => {
      const coords = el.CodeMirror.charCoords({ line: lineIndex, ch: index }, 'window');
      return { x: (coords.left + coords.right) / 2, y: (coords.top + coords.bottom) / 2 };
    }, { ch, line });

  await page.mouse.dblclick(point.x, point.y);
  await expect(page.locator('.CodeMirror-selected').first()).toBeVisible();
  await page.waitForTimeout(DOUBLE_CLICK_RESET_MS);
  await page.mouse.click(point.x, point.y, { button: 'right' });

  await expect(setAsVariable.menu()).toBeVisible();
  await setAsVariable.menuAction().click();

  const popover = setAsVariable.popover();
  await expect(popover).toBeVisible();
  return popover;
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

export {
  openSetAsVariableMenu,
  openSetAsVariablePopover,
  openSetAsVariablePopoverAtChar,
  selectVariableScope,
  selectWordAndRightClick
};
