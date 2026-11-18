import { test, expect, Page } from '../../playwright';
import { selectRequestPaneTab } from './pane';
import { buildSidebarLocators } from '../sidebar/collection-tree';

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
  maxRedirectsInput: () => page.locator('#maxRedirects')
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

const buildLocators = (page: Page) => ({
  requestSettings: buildRequestSettingsLocators(page),
  sidebar: buildSidebarLocators(page)
});

/**
 * Open a sidebar request's Settings tab and assert its Max Redirects value, as rendered.
 * `expected` is the on-screen text, so a large ceiling is its serialized form (e.g. '1e+31').
 */
export const expectRequestMaxRedirects = async (page: Page, requestName: string, expected: string) => {
  await test.step(`Expect ${requestName} to show a max redirects of ${expected}`, async () => {
    const locators = buildLocators(page);
    await locators.sidebar.request(requestName).click();
    await selectRequestPaneTab(page, 'Settings');
    await expect(locators.requestSettings.maxRedirectsInput()).toHaveValue(expected);
  });
};
