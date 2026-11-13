import { Page, test } from '../../../../playwright';

const selectAll = (page: Page) => page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');

export const buildCollectionSettingsHeadersLocators = (page: Page) => {
  const content = () => page.getByTestId('collection-settings-content');
  const table = () => content().getByTestId('collection-headers');

  return {
    content,
    table,
    bulkEditToggle: () => content().getByTestId('bulk-edit-toggle'),
    keyValueEditToggle: () => content().getByTestId('key-value-edit-toggle'),
    bulkEditEditor: () => content().getByTestId('bulk-edit-editor').locator('.CodeMirror').first(),
    bulkEditLines: () => content().getByTestId('bulk-edit-editor').locator('.CodeMirror-line'),
    rowByName: (name: string) => table().locator(`tbody tr[data-row-name="${name}"]`),
    nameByName: (name: string) =>
      table().locator(`tbody tr[data-row-name="${name}"]`).getByTestId('column-name'),
    valueByName: (name: string) =>
      table().locator(`tbody tr[data-row-name="${name}"]`).getByTestId('column-value'),
    valueLineByName: (name: string) =>
      table().locator(`tbody tr[data-row-name="${name}"]`).getByTestId('column-value').locator('.CodeMirror-line'),
    addRow: () => table().locator('tbody tr').last()
  };
};

export const switchToBulkEdit = async (page: Page) => {
  await test.step('Switch collection headers to Bulk Edit', async () => {
    const headers = buildCollectionSettingsHeadersLocators(page);
    await headers.bulkEditToggle().click();
    await headers.bulkEditEditor().waitFor({ state: 'visible' });
  });
};

export const switchToKeyValue = async (page: Page) => {
  await test.step('Switch collection headers to Key/Value Edit', async () => {
    const headers = buildCollectionSettingsHeadersLocators(page);
    await headers.keyValueEditToggle().click();
    await headers.table().waitFor({ state: 'visible' });
  });
};

export const fillCollectionHeaderRow = async (page: Page, name: string, value: string) => {
  await test.step(`Add collection header "${name}: ${value}"`, async () => {
    const headers = buildCollectionSettingsHeadersLocators(page);
    const row = headers.addRow();
    await row.getByTestId('column-name').locator('.CodeMirror').click();
    await page.keyboard.type(name);
    await headers.rowByName(name).waitFor({ state: 'visible' });
    await headers.valueByName(name).locator('.CodeMirror').click();
    await page.keyboard.type(value);
  });
};

export const editCollectionHeaderValue = async (page: Page, name: string, value: string) => {
  await test.step(`Edit collection header "${name}" value to "${value}"`, async () => {
    const headers = buildCollectionSettingsHeadersLocators(page);
    await headers.valueByName(name).locator('.CodeMirror').click();
    await selectAll(page);
    await page.keyboard.type(value);
  });
};

export const writeBulkEditHeaders = async (page: Page, text: string) => {
  await test.step('Write collection headers in Bulk Edit', async () => {
    const editor = buildCollectionSettingsHeadersLocators(page).bulkEditEditor();
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
