import { expect, Locator, Page, test } from '../../../playwright';
import { AUTH_MODE_LABELS } from '../constants';
import { selectAuthMode, selectRequestPaneTab } from './actions';
import { buildCommonLocators } from './locators';

export const buildSensitiveFieldLocators = (page: Page) => ({
  warning: (fieldName: string) => page.getByTestId(`sensitive-field-warning-${fieldName}`),
  warningIn: (root: Locator, fieldName: string) => root.getByTestId(`sensitive-field-warning-${fieldName}`),
  tooltip: (text: string) => page.locator('.react-tooltip').filter({ hasText: text })
});

/**
 * Click a request in the sidebar and wait until its tab is active.
 * @param page - The page object
 * @param requestName - The request name shown in the sidebar
 */
export const selectSidebarRequest = async (page: Page, requestName: string) => {
  await test.step(`Select request "${requestName}"`, async () => {
    const { sidebar, tabs } = buildCommonLocators(page);
    await sidebar.request(requestName).click();
    await expect(tabs.activeRequestTab()).toContainText(requestName);
  });
};

/**
 * Open a request's Auth tab on API Key and wait until the value field is ready.
 * The placement defaults to Header once the form has settled.
 * @param page - The page object
 * @param requestName - The request name shown in the sidebar
 */
export const openApiKeyValue = async (page: Page, requestName: string) => {
  await test.step(`Open the API key value for "${requestName}"`, async () => {
    const { auth } = buildCommonLocators(page);
    await selectSidebarRequest(page, requestName);
    await selectRequestPaneTab(page, 'Auth');
    await selectAuthMode(page, AUTH_MODE_LABELS.APIKEY);
    await expect(auth.apiKey.placementLabel()).toHaveText('Header');
  });
};

/**
 * Add a named row to a Vars table. The last row is the empty stub; typing its name promotes it.
 * @param page - The page object
 * @param tableId - The table test id, such as `request-vars-req`
 * @param name - The variable name
 * @param value - The variable value
 */
export const addVarsRow = async (page: Page, tableId: string, name: string, value: string) => {
  await test.step(`Add "${name}" to ${tableId}`, async () => {
    const { table } = buildCommonLocators(page);
    const varsTable = table(tableId);
    const nameInput = varsTable.rowNameInput(varsTable.row().last());
    await nameInput.click();
    await page.keyboard.type(name);

    const row = varsTable.rowByName(name);
    await expect(row).toBeVisible();

    const valueEditor = varsTable.rowValueEditor(row);
    await valueEditor.click({ force: true });
    await expect(valueEditor).toHaveClass(/CodeMirror-focused/);
    await page.keyboard.insertText(value);
  });
};
