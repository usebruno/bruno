import { Page } from '../../../../playwright';

export const buildQueryParamsLocators = (page: Page) => {
  const rowByName = (name: string) => page.getByTestId('query-params-table').locator(`tbody tr[data-row-name="${name}"]`);
  const valueByName = (name: string) => rowByName(name).getByTestId('column-value');
  return {
    rowByName,
    valueByName,
    valueByNameText: (name: string) => valueByName(name).locator('.CodeMirror-line'),
    checkboxByName: (name: string) => rowByName(name).getByTestId('column-checkbox')
  };
};
