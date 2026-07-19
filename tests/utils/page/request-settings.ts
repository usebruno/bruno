import { expect, Page, test } from '../../../playwright';
import { buildSidebarLocators } from './sidebar';

/** Builds locators for the request Settings cookie controls and related request flow. */
export const buildRequestSettingsLocators = (page: Page) => {
  const sidebar = buildSidebarLocators(page);

  return {
    collection: sidebar.collection,
    request: sidebar.request,
    storeCookiesToggle: () => page.getByTestId('store-cookies-toggle'),
    sendCookiesToggle: () => page.getByTestId('send-cookies-toggle'),
    sendButton: () => page.getByTestId('send-arrow-icon'),
    responseStatus: () => page.getByTestId('response-status-code'),
    settingsTab: () => page.locator('[data-testid="request-pane"] > .px-4 .tabs').getByRole('tab', { name: 'Settings' }),
    overflowButton: () => page.locator('[data-testid="request-pane"] > .px-4 .tabs .more-tabs'),
    overflowSettingsItem: () => page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Settings' })
  };
};

/** Opens the collection used by request Settings E2E tests. */
export const openRequestSettingsCollection = async (page: Page, collectionName: string) => {
  await test.step(`Open request settings collection "${collectionName}"`, async () => {
    const locators = buildRequestSettingsLocators(page);
    await expect(locators.collection(collectionName)).toBeVisible();
    await locators.collection(collectionName).click();
  });
};

/** Opens a request and selects its Settings tab. */
export const openRequestSettings = async (page: Page, requestName: string) => {
  await test.step(`Open settings for request "${requestName}"`, async () => {
    const locators = buildRequestSettingsLocators(page);
    await locators.request(requestName).click();

    await expect(async () => {
      if (await locators.settingsTab().isVisible()) {
        await locators.settingsTab().click({ timeout: 2000 });
      } else {
        await locators.overflowButton().click({ timeout: 2000 });
        await locators.overflowSettingsItem().click({ force: true, timeout: 2000 });
      }
      await expect(locators.settingsTab()).toContainClass('active', { timeout: 2000 });
    }).toPass({ timeout: 15000 });

    await expect(locators.storeCookiesToggle()).toBeVisible();
  });
};

/** Opens a request from the request Settings fixture collection. */
export const openRequestFromSettingsCollection = async (page: Page, requestName: string) => {
  await test.step(`Open request "${requestName}"`, async () => {
    await buildRequestSettingsLocators(page).request(requestName).click();
  });
};

/** Asserts the checked state of a request-level cookie setting. */
export const expectCookieSetting = async (
  page: Page,
  setting: 'store' | 'send',
  enabled: boolean
) => {
  await test.step(`Expect automatic cookie ${setting} to be ${enabled ? 'enabled' : 'disabled'}`, async () => {
    const locators = buildRequestSettingsLocators(page);
    const toggle = setting === 'store' ? locators.storeCookiesToggle() : locators.sendCookiesToggle();
    if (enabled) {
      await expect(toggle).toBeChecked();
    } else {
      await expect(toggle).not.toBeChecked();
    }
  });
};

/** Toggles a request-level cookie setting. */
export const toggleCookieSetting = async (page: Page, setting: 'store' | 'send') => {
  await test.step(`Toggle automatic cookie ${setting}`, async () => {
    const locators = buildRequestSettingsLocators(page);
    const toggle = setting === 'store' ? locators.storeCookiesToggle() : locators.sendCookiesToggle();
    await toggle.click();
  });
};

/** Sends the active request and waits for the expected response status. */
export const sendRequestAndExpectStatus = async (page: Page, status: string) => {
  await test.step(`Send request and expect status ${status}`, async () => {
    const locators = buildRequestSettingsLocators(page);
    await locators.sendButton().click();
    await expect(locators.responseStatus()).toContainText(status, { timeout: 15000 });
  });
};
