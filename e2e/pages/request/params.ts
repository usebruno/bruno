import { Page, test } from '../../playwright';

const selectAll = (page: Page) => page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');

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
    nameByName: (name: string) => rowByName(name).getByTestId('column-name'),
    // Name cells are plain <input>s (not CodeMirror).
    nameText: (name: string) => table().getByTestId('column-name').locator(`input[value="${name}"]`),
    valueText: (value: string) => table().getByTestId('column-value').getByText(value, { exact: true }),
    addRow: () => table().locator('tbody tr').last(),
    bulkEditToggle: () => pane().getByTestId('bulk-edit-toggle'),
    keyValueEditToggle: () => pane().getByTestId('key-value-edit-toggle'),
    bulkEditEditor: () => pane().getByTestId('bulk-edit-editor').locator('.CodeMirror').first(),
    bulkLine: (text: string) => pane().getByTestId('bulk-edit-editor').getByText(text, { exact: true })
  };
};

export const switchQueryParamsToBulkEdit = async (page: Page) => {
  await test.step('Switch query params to Bulk Edit', async () => {
    const params = buildQueryParamsLocators(page);
    await params.bulkEditToggle().click();
    await params.bulkEditEditor().waitFor({ state: 'visible' });
  });
};

export const switchQueryParamsToKeyValue = async (page: Page) => {
  await test.step('Switch query params to Key/Value Edit', async () => {
    const params = buildQueryParamsLocators(page);
    await params.keyValueEditToggle().click();
    await params.table().waitFor({ state: 'visible' });
  });
};

export const fillQueryParamRow = async (page: Page, name: string, value: string) => {
  await test.step(`Add query param "${name}: ${value}"`, async () => {
    const params = buildQueryParamsLocators(page);
    const row = params.addRow();
    // Query param Name uses a plain input; Value uses MultiLineEditor (CodeMirror).
    const nameInput = row.getByTestId('column-name').locator('input');
    await nameInput.waitFor({ state: 'visible' });
    await nameInput.fill(name);
    await params.rowByName(name).waitFor({ state: 'visible' });
    const valueEditor = params.valueByName(name).locator('.CodeMirror');
    await valueEditor.waitFor({ state: 'visible' });
    await valueEditor.click();
    await page.keyboard.type(value);
  });
};

export const editQueryParamValue = async (page: Page, name: string, value: string) => {
  await test.step(`Edit query param "${name}" value to "${value}"`, async () => {
    const params = buildQueryParamsLocators(page);
    await params.valueByName(name).locator('.CodeMirror').click();
    await selectAll(page);
    await page.keyboard.type(value);
  });
};

export const writeBulkEditQueryParams = async (page: Page, text: string) => {
  await test.step('Write query params in Bulk Edit', async () => {
    const editor = buildQueryParamsLocators(page).bulkEditEditor();
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
