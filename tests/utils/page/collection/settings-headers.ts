import { Page, test } from '../../../../playwright';

export const buildCollectionSettingsHeadersLocators = (page: Page) => {
  const content = () => page.getByTestId('collection-settings-content');
  const table = () => content().getByTestId('collection-headers');

  return {
    content,
    table,
    bulkEditToggle: () => content().getByTestId('bulk-edit-toggle'),
    keyValueEditToggle: () => content().getByTestId('key-value-edit-toggle'),
    bulkEditEditor: () => content().getByTestId('bulk-edit-editor').locator('.CodeMirror').first(),
    rowByName: (name: string) => table().locator(`tbody tr[data-row-name="${name}"]`),
    nameByName: (name: string) =>
      table().locator(`tbody tr[data-row-name="${name}"]`).getByTestId('column-name'),
    valueByName: (name: string) =>
      table().locator(`tbody tr[data-row-name="${name}"]`).getByTestId('column-value'),
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
    await page.keyboard.press('Control+A');
    await page.keyboard.type(value);
  });
};

export const writeBulkEditHeaders = async (page: Page, text: string) => {
  await test.step('Write collection headers in Bulk Edit', async () => {
    const editor = buildCollectionSettingsHeadersLocators(page).bulkEditEditor();
    await editor.waitFor({ state: 'visible' });
    await editor.evaluate((el, value) => {
      const cm = (el as { CodeMirror?: { setValue: (next: string) => void } }).CodeMirror;
      if (!cm) {
        throw new Error('No CodeMirror in collection headers bulk editor');
      }
      cm.setValue(value);
    }, text);
  });
};
