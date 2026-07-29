import { Page } from '../../../playwright';

/**
 * Toast (react-hot-toast) locators, parameterised by message.
 */
export const buildToastLocators = (page: Page) => ({
  byMessage: (message: string) => page.getByText(message),
  confirmTextContent: (text: string) => page.getByText(text, { exact: true })
});
