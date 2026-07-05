import { Page } from '../../../playwright';

/**
 * Toast (react-hot-toast) locators, parameterised by message.
 */
export const buildToastLocators = (page: Page) => {
  const byMessage = (message: string | RegExp) => page.getByRole('status').filter({ hasText: message });
  return {
    byMessage,
    success: byMessage,
    error: byMessage
  };
};
