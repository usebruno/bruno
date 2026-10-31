import { expect, Page, Locator } from '../..';

/**
 * Locators for dropdown menus, including menus rendered in a tippy popover.
 */
export const buildDropdownLocators = (page: Page) => ({
  item: (text: string) => page.locator('.dropdown-item').filter({ hasText: text }),
  tippyItem: (text: string) => page.locator('.tippy-box .dropdown-item').filter({ hasText: text })
});

/**
 * Returns true if the element is on top at its centre (not hidden behind a header),
 * i.e. the topmost element at its centre is inside a dropdown/tippy container.
 * @param locator - The dropdown item locator
 * @returns Whether the item is the topmost element at its own centre
 */
export const elementIsInsideDropdown = async (locator: Locator) => {
  const box = await locator.boundingBox();
  expect(box, 'dropdown item should have a layout box').not.toBeNull();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;
  return locator.page().evaluate(
    ({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('.tippy-box, .dropdown')),
    { x, y }
  );
};
