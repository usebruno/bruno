import { Locator, Page } from '../../../playwright';

/**
 * Locators for the response example editor pane.
 *
 * The pane has two modes: an editing mode with a name input, and a read mode that renders the
 * name as a heading. Which one is present tells you the mode, so both are exposed.
 */
export const buildResponseExampleLocators = (page: Page) => ({
  title: (): Locator => page.getByTestId('response-example-title'),
  nameInput: (): Locator => page.getByTestId('response-example-name-input'),
  descriptionInput: (): Locator => page.getByTestId('response-example-description-input')
});
