import { expect, Locator, test } from '../../playwright';
import { buildSignalRCommonLocators } from '../utils/page/locators';
import { waitForReadyPage } from '../utils/page';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const BRU_REQ_NAME = 'signalr-persistence';
const BRU_PATH = join(__dirname, 'fixtures/collection/signalr-persistence.bru');

const isRequestSaved = async (saveButton: Locator) => {
  return await saveButton.locator('svg').evaluate((node) => (node as HTMLElement).classList.contains('cursor-default'));
};

test.describe.serial('signalr persistence', () => {
  let originalData = '';

  test.beforeAll(async () => {
    originalData = await readFile(BRU_PATH, 'utf8');
  });

  test.afterAll(async () => {
    await writeFile(BRU_PATH, originalData, 'utf8');
  });

  test('save new signalr url', async ({ pageWithUserData: page, restartApp }) => {
    const replacementUrl = 'http://localhost:8082/hub';
    const locators = buildSignalRCommonLocators(page);
    const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

    await page.locator('#sidebar-collection-name').click();
    await page.getByTestId('collections').getByTitle(BRU_REQ_NAME).click();

    const originalUrl = 'http://localhost:8081/hub';
    await page.locator('.input-container').filter({ hasText: originalUrl }).first().click();
    await page.keyboard.press(selectAllShortcut);
    await page.keyboard.insertText(replacementUrl);

    await expect.poll(() => isRequestSaved(locators.saveButton())).toBe(false);
    await locators.saveButton().click();
    await expect.poll(() => isRequestSaved(locators.saveButton())).toBe(true);

    // Restart to confirm persistence
    const newApp = await restartApp();
    const newPage = await waitForReadyPage(newApp);
    await newPage.locator('#sidebar-collection-name').click();
    await newPage.getByTestId('collections').getByTitle(BRU_REQ_NAME).click();
    await expect(newPage.locator('.input-container').filter({ hasText: replacementUrl }).first()).toBeAttached();
  });

  test('save new message name', async ({ pageWithUserData: page, restartApp }) => {
    const locators = buildSignalRCommonLocators(page);

    await page.locator('#sidebar-collection-name').click();
    await page.getByTestId('collections').getByTitle(BRU_REQ_NAME).click();

    await locators.message.header(0).click();
    await locators.message.header(0).click();
    await locators.message.label(0).dblclick();
    const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';
    await page.keyboard.press(selectAllShortcut);
    await page.keyboard.insertText('CustomPing');

    await locators.saveButton().click();
    await expect.poll(() => isRequestSaved(locators.saveButton())).toBe(true);

    // Restart to confirm persistence
    const newApp = await restartApp();
    const newPage = await waitForReadyPage(newApp);
    await newPage.locator('#sidebar-collection-name').click();
    await newPage.getByTestId('collections').getByTitle(BRU_REQ_NAME).click();
    const newLocators = buildSignalRCommonLocators(newPage);
    await expect(newLocators.message.label(0)).toHaveText('CustomPing');
  });
});
