import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import { openRequest, selectRequestPaneTab } from '../../utils/page';

const COLLECTION = 'req-description';
const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';

test.describe('Request Description - Write (Query Params)', () => {
  test('writes a multiline description to a query param and persists it to the .bru file', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    await openRequest(page, COLLECTION, 'request-with-descriptions');
    await selectRequestPaneTab(page, 'Params');

    const queryTable = page.getByTestId('query-params-table');
    const plainRow = queryTable.locator('tbody tr').nth(2);
    const descCell = plainRow.getByTestId('column-description');

    await descCell.evaluate((el) => {
      const cmEl = el.querySelector('.CodeMirror');
      if (!cmEl) throw new Error('No CodeMirror in plain-query description cell');
      const cm = (cmEl as any).CodeMirror;
      if (!cm) throw new Error('CodeMirror instance not found');
      cm.setValue('Query line one\nQuery line two');
    });

    await expect(descCell.locator('.CodeMirror-line').nth(0)).toHaveText('Query line one');
    await expect(descCell.locator('.CodeMirror-line').nth(1)).toHaveText('Query line two');

    await page.keyboard.press(saveShortcut);
    await expect(page.getByText('Request saved successfully')).toBeVisible({ timeout: 5000 });

    const bruPath = path.join(collectionFixturePath!, 'request-with-descriptions.bru');
    const fileContent = fs.readFileSync(bruPath, 'utf8');

    expect(fileContent).toContain('@description');
    expect(fileContent).toContain('Query line one');
    expect(fileContent).toContain('Query line two');
  });

  test('keeps query param descriptions when the request url is edited', async ({ pageWithUserData: page }) => {
    await openRequest(page, COLLECTION, 'request-with-descriptions');
    await selectRequestPaneTab(page, 'Params');

    const queryTable = page.getByTestId('query-params-table');
    const firstRowDescription = queryTable.locator('tbody tr').nth(0).getByTestId('column-description');
    await expect(firstRowDescription.locator('.CodeMirror-line').nth(0)).toHaveText('Single-line query desc');

    const urlEditor = page.locator('#request-url .CodeMirror');
    await urlEditor.evaluate((el) => {
      (el as any).CodeMirror.setValue('https://example.com/api?q=search&page=2&plain-query=value');
    });
    await expect(queryTable.locator('tbody tr').nth(1).getByTestId('column-value')).toContainText('2');
    await expect(firstRowDescription.locator('.CodeMirror-line').nth(0)).toHaveText('Single-line query desc');

    // typing in the url bar rebuilds the params on every keystroke
    await urlEditor.click();
    await page.keyboard.press('End');
    await page.keyboard.type('-edited');
    await expect(queryTable.locator('tbody tr').nth(2).getByTestId('column-value')).toContainText('value-edited');
    await expect(firstRowDescription.locator('.CodeMirror-line').nth(0)).toHaveText('Single-line query desc');
    await expect(queryTable.locator('tbody tr').nth(1).getByTestId('column-description').locator('.CodeMirror-line').nth(0))
      .toHaveText('Multi-line query desc line one');
  });
});
