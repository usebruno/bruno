import { Locator, Page, test } from '../../playwright';
import { buildCodeMirrorLocators } from '../shared-ui/code-editor';
import { buildTableLocator } from '../shared-ui/table';
import { buildVarsPanelLocators } from '../request/vars';

export type VarsTableType = 'preRequest' | 'postResponse';

const TABLE_ID: Record<VarsTableType, string> = {
  preRequest: 'collection-vars-req',
  postResponse: 'collection-vars-res'
};

const headerCell = (table: Locator, name: string) =>
  table.locator('thead').getByText(name, { exact: true });

export const buildCollectionSettingsVarsLocators = (page: Page) => {
  const panel = buildVarsPanelLocators(page)('collection').container;
  const varsTable = (type: VarsTableType) => buildTableLocator(page)(TABLE_ID[type]);
  const table = (type: VarsTableType) => varsTable(type).container();
  const row = (type: VarsTableType, name: string) => varsTable(type).rowByName(name);
  const nameCell = (rowLocator: Locator) => rowLocator.getByTestId('column-name');
  const valueCell = (rowLocator: Locator) => rowLocator.getByTestId('column-value');
  const nameInput = (type: VarsTableType, name: string) =>
    row(type, name).getByTestId('column-name').locator('input');
  const valueEditor = (type: VarsTableType, name: string) =>
    buildCodeMirrorLocators(page).within(valueCell(row(type, name)));
  const rowCheckbox = (type: VarsTableType, name: string) =>
    row(type, name).getByTestId('column-checkbox');
  const preRequestTable = () => table('preRequest');
  const postResponseTable = () => table('postResponse');
  const preRequestTitle = () => panel().getByText('Pre Request', { exact: true });
  const postResponseTitle = () => panel().getByText('Post Response', { exact: true });
  const nameColumnHeader = (type: VarsTableType) => headerCell(table(type), 'Name');
  const valueColumnHeader = (type: VarsTableType) => headerCell(table(type), 'Value');
  const expressionColumnHeader = (type: VarsTableType) => headerCell(table(type), 'Expr');
  const saveButton = () => panel().getByRole('button', { name: 'Save', exact: true });

  return {
    panel,
    table,
    row,
    nameCell,
    valueCell,
    nameInput,
    valueEditor,
    rowCheckbox,
    preRequestTitle,
    postResponseTitle,
    preRequestTable,
    postResponseTable,
    nameColumnHeader,
    valueColumnHeader,
    expressionColumnHeader,
    saveButton
  };
};

export const addCollectionVar = async (
  page: Page,
  type: VarsTableType,
  name: string,
  value: string
) => {
  const vars = buildCollectionSettingsVarsLocators(page);

  await test.step(`Add collection var "${name}" to ${type} table`, async () => {
    const lastRow = vars.table(type).locator('tbody tr').last();
    await vars.nameCell(lastRow).locator('input').click();
    await page.keyboard.type(name);

    const editor = vars.valueEditor(type, name);
    await editor.waitFor({ state: 'visible' });
    await editor.locator('textarea').focus();

    await page.keyboard.insertText(value);
  });
};
