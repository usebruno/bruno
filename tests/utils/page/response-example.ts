import { Page } from '../../../playwright';

/**
 * Locators for the response-example view — the Create Example modal input,
 * the example tab's title bar, and its response pane content.
 */
export const buildResponseExampleLocators = (page: Page) => ({
  nameInput: () => page.getByTestId('create-example-name-input'),
  title: () => page.getByTestId('response-example-title'),
  binaryPreview: () => page.getByTestId('response-example-binary-preview'),
  responseContent: () => page.getByTestId('response-example-response-content')
});
