import { test, Page } from '../..';
import { AUTH_MODE_LABELS } from '../../constants';
import { selectRequestPaneTab } from './pane';
import { writeFieldValue } from '../shared-ui/single-line-editor';

/**
 * Open the auth mode dropdown and pick a mode by its visible label.
 * @param page - The page object
 * @param modeLabel - Dropdown item text (e.g. 'Bearer Token', 'Basic Auth')
 */
export const selectAuthMode = async (page: Page, modeLabel: string) => {
  await page.locator('.auth-mode-label').click();
  await page.locator('.dropdown-item').filter({ hasText: modeLabel }).click();
};

/** Opens the request's Auth tab, picks API Key and sets its Value field. */
export const setApiKeyValue = async (page: Page, value: string) => {
  await test.step(`Set the API key value to "${value}"`, async () => {
    await selectRequestPaneTab(page, 'Auth');
    await selectAuthMode(page, AUTH_MODE_LABELS.APIKEY);
    await writeFieldValue(page, 'Value', value);
  });
};
