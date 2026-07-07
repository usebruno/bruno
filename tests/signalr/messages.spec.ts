import { expect, test } from '../../playwright';
import { buildSignalRCommonLocators } from '../utils/page/locators';

const MULTI_REQ_NAME = /^signalr-multi-msg$/;

test.describe.serial('signalr messages', () => {
  test('multiple messages are visible', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').click();
    await page.getByTestId('collections').getByTitle(MULTI_REQ_NAME).click();
    const locators = buildSignalRCommonLocators(page);
    await expect(locators.message.label(0)).toBeVisible();
    await expect(locators.message.label(1)).toBeVisible();
  });

  test('messages display correct names', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').click();
    await page.getByTestId('collections').getByTitle(MULTI_REQ_NAME).click();
    const locators = buildSignalRCommonLocators(page);
    await expect(locators.message.label(0)).toHaveText('JoinGroup');
    await expect(locators.message.label(1)).toHaveText('LeaveGroup');
  });

  test('delete a message', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').click();
    await page.getByTestId('collections').getByTitle(MULTI_REQ_NAME).click();
    await expect(buildSignalRCommonLocators(page).message.header(0)).toBeVisible({ timeout: 5000 });
    const locators = buildSignalRCommonLocators(page);
    await locators.message.header(0).click();
    await locators.message.deleteButton(0).click();
    await expect(locators.message.label(1)).not.toBeAttached();
  });
});
