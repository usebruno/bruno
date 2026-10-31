import { test, expect, Page } from '../..';

/**
 * Locators for the tags editor shown in request and folder settings.
 */
export const buildTagsLocators = (page: Page) => ({
  input: () => page.getByTestId('tag-input').getByRole('textbox'),
  item: (tagName: string) => page.locator('.tag-item', { hasText: tagName }),
  ownItem: (tagName: string) => page.locator('.tag-item:not(.inherited)', { hasText: tagName }),
  ownItems: () => page.locator('.tag-item:not(.inherited)'),
  error: () => page.getByTestId('tag-error'),
  inheritedToggle: () => page.getByTestId('inherited-tags-toggle'),
  inheritedList: () => page.getByTestId('inherited-tag-list'),
  inheritedItems: () => page.getByTestId('inherited-tag'),
  inheritedItem: (tagName: string) => page.getByTestId('inherited-tag').filter({ hasText: tagName })
});

const buildLocators = (page: Page) => ({
  tags: buildTagsLocators(page)
});

/**
 * Types a tag into the tag editor and commits it with Enter. Shared by the request Settings tab
 * and the folder Settings tab, which render the same TagList.
 * @param page - The Playwright page object
 * @param tagName - The tag to add
 * @returns void
 */
export const addTag = async (page: Page, tagName: string) => {
  await test.step(`Add tag "${tagName}"`, async () => {
    const input = buildLocators(page).tags.input();
    await expect(input).toBeVisible();
    await input.fill(tagName);
    await input.press('Enter');
  });
};

/**
 * Removes a tag the item owns. Inherited tags have no remove control, so this only ever
 * targets the removable chips.
 * @param page - The Playwright page object
 * @param tagName - The tag to remove
 * @returns void
 */
export const removeTag = async (page: Page, tagName: string) => {
  await test.step(`Remove tag "${tagName}"`, async () => {
    const chip = buildLocators(page).tags.ownItem(tagName);
    await expect(chip).toBeVisible();
    await chip.locator('.tag-remove').click();
  });
};
