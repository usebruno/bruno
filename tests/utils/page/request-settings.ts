import { Page, test } from '../../../playwright';

/**
 * Locators for the request "Settings" tab — specifically the inheritable
 * Timeout control (always-visible input plus its "Inherited · Override" / "Inherit" status line).
 */
export const buildRequestSettingsLocators = (page: Page) => ({
  timeoutInput: () => page.getByTestId('timeout-input'),
  timeoutInherited: () => page.getByTestId('timeout-inherited'),
  timeoutSourceLink: () => page.getByTestId('timeout-source'),
  timeoutOverrideButton: () => page.getByTestId('timeout-override'),
  timeoutInheritButton: () => page.getByTestId('timeout-inherit'),
  encodeUrlToggle: () => page.getByTestId('encode-url-toggle'),
  followRedirectsToggle: () => page.getByTestId('follow-redirects-toggle'),
  forwardAuthToggle: () => page.getByTestId('forward-auth-header-toggle'),
  maxRedirectsInput: () => page.locator('#maxRedirects'),
  tagsInput: () => page.getByTestId('tag-input').getByRole('textbox'),
  tagChip: () => page.getByTestId('tag-chip')
});

/**
 * Reset the request's timeout back to "inherit" from the Settings tab.
 * Waits for the inherit control to appear so the next step is reliable.
 */
export const resetRequestTimeoutToInherit = async (page: Page) => {
  await test.step('Reset request timeout to inherit', async () => {
    const settings = buildRequestSettingsLocators(page);
    await settings.timeoutInheritButton().click();
    await settings.timeoutInherited().waitFor({ state: 'visible' });
  });
};

/**
 * Types a tag into the request Settings tag field and commits it with Enter.
 * @param page - The Playwright page object
 * @param tagName - The tag to add
 * @returns void
 */
export const addRequestTag = async (page: Page, tagName: string) => {
  await test.step(`Enter tag "${tagName}"`, async () => {
    const input = buildRequestSettingsLocators(page).tagsInput();
    await input.fill(tagName);
    await input.press('Enter');
  });
};
