import { Page, test } from '../../playwright';
import { buildBulkEditorLocators } from '../shared-ui/bulk-editor';

const selectAll = (page: Page) => page.keyboard.press('ControlOrMeta+a');

export const buildQueryParamsLocators = (page: Page) => {
  const pane = () => page.getByTestId('request-pane');
  const table = () => page.getByTestId('query-params-table');
  const rowByName = (name: string) => table().locator(`tbody tr[data-row-name="${name}"]`);
  const valueByName = (name: string) => rowByName(name).getByTestId('column-value');

  return {
    table,
    rowByName,
    valueByName,
    valueByNameText: (name: string) => valueByName(name).locator('.CodeMirror-line'),
    checkboxByName: (name: string) => rowByName(name).getByTestId('column-checkbox'),
    newRowNameInput: () => table().locator('tbody tr').last().getByTestId('column-name').locator('input'),
    valueEditorByName: (name: string) => valueByName(name).locator('.CodeMirror'),
    ...buildBulkEditorLocators(pane())
  };
};

export const switchQueryParamsToBulkEdit = async (page: Page) => {
  await test.step('Switch query params to Bulk Edit', async () => {
    const params = buildQueryParamsLocators(page);
    await params.bulkEditToggle().click();
    await params.bulkEditor().waitFor({ state: 'visible' });
  });
};

export const switchQueryParamsToKeyValue = async (page: Page) => {
  await test.step('Switch query params to Key/Value Edit', async () => {
    const params = buildQueryParamsLocators(page);
    await params.keyValueEditToggle().click();
    await params.table().waitFor({ state: 'visible' });
  });
};

export const addQueryParam = async (page: Page, name: string, value: string) => {
  await test.step(`Add query param "${name}: ${value}"`, async () => {
    const params = buildQueryParamsLocators(page);
    const nameInput = params.newRowNameInput();
    await nameInput.waitFor({ state: 'visible' });
    await nameInput.fill(name);
    const valueEditor = params.valueEditorByName(name);
    await valueEditor.waitFor({ state: 'visible' });
    await valueEditor.click();
    await page.keyboard.type(value);
  });
};

export const editQueryParamValue = async (page: Page, name: string, value: string) => {
  await test.step(`Edit query param "${name}" value to "${value}"`, async () => {
    const params = buildQueryParamsLocators(page);
    await params.valueEditorByName(name).click();
    await selectAll(page);
    await page.keyboard.type(value);
  });
};

export const replaceQueryParamsInBulkEditor = async (page: Page, text: string) => {
  await test.step('Replace query params in Bulk Edit', async () => {
    const editor = buildQueryParamsLocators(page).bulkEditor();
    const textarea = editor.locator('textarea');
    await editor.waitFor({ state: 'visible' });
    await editor.click();
    await selectAll(page);
    await textarea.fill(text);

    const lastLine = text.split('\n').filter(Boolean).at(-1);
    if (lastLine) {
      await editor.locator('.CodeMirror-line').filter({ hasText: lastLine }).waitFor({ state: 'visible' });
    }
  });
};
