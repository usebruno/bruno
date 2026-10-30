import { Page } from '../../../../playwright';

export const buildQueryParamsLocators = (page: Page) => ({
  rowByName: (name: string) => page.getByTestId('query-params-table').locator(`tbody tr[data-row-name="${name}"]`),
  valueByName: (name: string) =>
    page.getByTestId('query-params-table').locator(`tbody tr[data-row-name="${name}"]`).getByTestId('column-value'),
  descriptionFirstLineByName: (name: string) =>
    page
      .getByTestId('query-params-table')
      .locator(`tbody tr[data-row-name="${name}"]`)
      .getByTestId('column-description')
      .locator('.CodeMirror-line')
      .first()
});
