import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import { openRequest, selectRequestPaneTab } from '../../utils/page';

const COLLECTION = 'req-description-yml';
const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';

test.describe('Request Description (YAML) - Write (Headers)', () => {
  test('writes a multiline description to a request header and persists it to the .yml file', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    await openRequest(page, COLLECTION, 'request-with-descriptions');
    await selectRequestPaneTab(page, 'Headers');

    const headersTable = page.getByTestId('request-headers-table');
    const xPlainRow = headersTable.locator('tbody tr').filter({
      has: page.locator('[data-testid="column-name"] .CodeMirror-line', { hasText: 'X-Plain' })
    });
    const descCell = xPlainRow.getByTestId('column-description');

    await descCell.evaluate((el) => {
      const cmEl = el.querySelector('.CodeMirror');
      if (!cmEl) throw new Error('No CodeMirror in X-Plain description cell');
      const cm = (cmEl as any).CodeMirror;
      if (!cm) throw new Error('CodeMirror instance not found');
      cm.setValue('First line\nSecond line');
    });

    await expect(descCell.locator('.CodeMirror-line').nth(0)).toHaveText('First line');
    await expect(descCell.locator('.CodeMirror-line').nth(1)).toHaveText('Second line');

    await page.keyboard.press(saveShortcut);
    await expect(page.getByText('Request saved successfully')).toBeVisible({ timeout: 5000 });

    const ymlPath = path.join(collectionFixturePath!, 'request-with-descriptions.yml');
    const fileContent = fs.readFileSync(ymlPath, 'utf8');

    expect(fileContent).toContain('description:');
    expect(fileContent).toContain('First line');
    expect(fileContent).toContain('Second line');
  });
});
