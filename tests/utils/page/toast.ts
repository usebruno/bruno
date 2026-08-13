import { Page } from '../../../playwright';

/**
 * Toast (react-hot-toast) locators, parameterised by message.
 */
export const buildToastLocators = (page: Page) => ({
  byMessage: (message: string | RegExp) =>
    page.locator('[data-testid="toast-container"]').getByText(message)
});
