import { Locator, Page } from '../../../playwright';

export const buildCodeMirrorLocators = (page: Page) => ({
  hint: (name: string) => page.locator('.CodeMirror-hints:visible').getByRole('option', { name, exact: true }),
  byTestId: (testId: string) => page.getByTestId(testId).locator('.CodeMirror').first(),
  within: (scope: Locator) => scope.locator('.CodeMirror').first(),
  /** Nth row's value-column editor in an EditableTable (Headers / Params / Vars / Assertions). */
  valueCellAt: (scope: Locator, rowIndex: number = 0) =>
    scope.locator('table tbody tr').nth(rowIndex).getByTestId('column-value').locator('.CodeMirror'),
  /** Warning icon beside a sensitive input. `fieldName` is the field or variable name. */
  sensitiveWarning: (fieldName: string) => page.getByTestId(`sensitive-field-warning-${fieldName}`),
  sensitiveWarningIn: (root: Locator, fieldName: string) => root.getByTestId(`sensitive-field-warning-${fieldName}`),
  sensitiveTooltip: (text: string) => page.getByTestId('sensitive-field-tooltip').filter({ hasText: text })
});
