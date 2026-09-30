import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import { openRequest, selectRequestPaneTab } from '../../utils/page';

const COLLECTION = 'req-description-yml';
const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';

test.describe('Request Description (YAML) - Write (Query Params)', () => {
  test('writes a multiline description to a query param and persists it to the .yml file', async ({
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

    const ymlPath = path.join(collectionFixturePath!, 'request-with-descriptions.yml');
    const fileContent = fs.readFileSync(ymlPath, 'utf8');

    expect(fileContent).toContain('description:');
    expect(fileContent).toContain('Query line one');
    expect(fileContent).toContain('Query line two');
  });
});
