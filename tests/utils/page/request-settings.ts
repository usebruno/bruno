import { Page, test } from '../../../playwright';
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
    await locators.collection(collectionName).waitFor({ state: 'visible' });
    await locators.collection(collectionName).click();
  });
};

/** Opens a request and selects its Settings tab. */
export const openRequestSettings = async (page: Page, requestName: string) => {
  await test.step(`Open settings for request "${requestName}"`, async () => {
    const locators = buildRequestSettingsLocators(page);
    await locators.request(requestName).click();

    const settingsTab = locators.settingsTab();
    const overflowButton = locators.overflowButton();
    await Promise.race([
      settingsTab.waitFor({ state: 'visible', timeout: 15000 }),
      overflowButton.waitFor({ state: 'visible', timeout: 15000 })
    ]);

    if (await settingsTab.isVisible()) {
      await settingsTab.click();
    } else {
      await overflowButton.click();
      await locators.overflowSettingsItem().waitFor({ state: 'visible' });
      await locators.overflowSettingsItem().click({ force: true });
    }

    await locators.storeCookiesToggle().waitFor({ state: 'visible', timeout: 15000 });
  });
};

/** Opens a request from the request Settings fixture collection. */
export const openRequestFromSettingsCollection = async (page: Page, requestName: string) => {
  await test.step(`Open request "${requestName}"`, async () => {
    await buildRequestSettingsLocators(page).request(requestName).click();
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

/** Sends the active request. */
export const sendRequestFromSettings = async (page: Page) => {
  await test.step('Send request', async () => {
    await buildRequestSettingsLocators(page).sendButton().click();
  });
};
