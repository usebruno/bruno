import { Page } from '../../../playwright';

/**
 * Builds locators for app toast notifications.
 */
export const buildToastLocators = (page: Page) => ({
  success: (message: string | RegExp) => page.getByText(message),
  error: (message: string | RegExp) => page.getByText(message)
});
