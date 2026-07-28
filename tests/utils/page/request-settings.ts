import { Page, test } from '../../../playwright';

/**
 * Locators for the request "Settings" tab — specifically the inheritable
 * Timeout control (custom input, reset-to-inherit button, inherit dropdown).
 */
export const buildRequestSettingsLocators = (page: Page) => ({
  /** The custom timeout <input> (only present when timeout is a custom value) */
  timeoutInput: () => page.locator('#timeout'),
  /** The "X" button that resets a custom timeout back to inherit */
  timeoutResetButton: () => page.getByRole('button', { name: 'Reset to inherit' }),
  /** The dropdown button shown when the timeout is inherited */
  timeoutInheritButton: () => page.getByRole('button', { name: 'Inherit', exact: true })
});

/**
 * Reset the request's timeout back to "inherit" from the Settings tab.
 * Waits for the inherit control to appear so the next step is reliable.
 */
export const resetRequestTimeoutToInherit = async (page: Page) => {
  await test.step('Reset request timeout to inherit', async () => {
    const settings = buildRequestSettingsLocators(page);
    await settings.timeoutResetButton().click();
    await settings.timeoutInheritButton().waitFor({ state: 'visible' });
  });
};
