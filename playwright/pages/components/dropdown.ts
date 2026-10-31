import { Page } from '../..';

/**
 * Locators for dropdown menus, including menus rendered in a tippy popover.
 */
export const buildDropdownLocators = (page: Page) => ({
  item: (text: string) => page.locator('.dropdown-item').filter({ hasText: text }),
  tippyItem: (text: string) => page.locator('.tippy-box .dropdown-item').filter({ hasText: text })
});
