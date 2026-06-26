import { Page } from '../../../playwright';

/**
 * Toast (react-hot-toast) locators, parameterised by message.
 */
export const buildToastLocators = (page: Page) => ({
  byMessage: (message: string | RegExp) => page.getByRole('status').filter({ hasText: message }),
  collectionRemovedFromWorkspace: () => page.getByText('Collection removed from workspace')
});
