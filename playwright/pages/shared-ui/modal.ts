import { expect, Page, Locator } from '../..';

/**
 * Locators for the shared Bruno modal (header, body, footer, buttons).
 */
export const buildModalLocators = (page: Page) => ({
  any: () => page.locator('.bruno-modal'),
  formError: (text: string | RegExp) =>
    page.locator('.bruno-modal [data-testid="form-error"]').getByText(text),
  tabOptions: () => page.locator('.bruno-modal-header-tabs').locator('.bruno-modal-header-tab'),
  title: (title: string) => page.locator('.bruno-modal-header-title').filter({ hasText: title }),
  byTitle: (title: string) => page.locator('.bruno-modal').filter({ has: page.locator('.bruno-modal-header-title').filter({ hasText: title }) }),
  itemNameInput: (root?: Locator) => (root ?? page.locator('.bruno-modal')).locator('#collection-item-name'),
  button: (name: string) => page.locator('.bruno-modal').getByRole('button', { name: name, exact: true }),
  closeButton: () => page.locator('.bruno-modal').getByTestId('modal-close-button'),
  card: () => page.locator('.bruno-modal-card'),
  footer: () => page.locator('.bruno-modal-footer'),
  submitButton: () => page.locator('.bruno-modal-footer .submit'),
  newRequestMethodOption: (id: string) => page.getByTestId(`method-selector-${id.toLowerCase()}`),
  newRequestVariableToken: (name: string) =>
    page.getByTestId('new-request-url').locator('.cm-variable-valid').filter({ hasText: name }).first(),
  backdrop: () => page.locator('.bruno-modal-backdrop')
});

// Dismiss an open modal if one is present
export const dismissModalIfOpen = async (page: Page) => {
  const modal = buildModalLocators(page);
  if (await modal.closeButton().isVisible()) {
    await modal.closeButton().click({ force: true });
    await expect(modal.card()).toBeHidden();
  }
};

/**
 * Clicks outside the modal backdrop to test click-outside behavior.
 * @param page - The Playwright Page object
 */
export const clickOutsideModal = async (page: Page) => {
  const modal = buildModalLocators(page);

  await modal.backdrop().click({
    position: { x: 10, y: 10 }
  });
};
