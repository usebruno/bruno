import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import { openRequest, selectRequestPaneTab } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page';

const COLLECTION = 'req-description';
const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';

test.describe('Request Description - Write (Headers, quote escaping)', () => {
  test('escapes embedded triple quotes and backslash-quotes in a multiline description and round-trips through disk', async ({
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

    const description = 'Backslash-quote: \\\'end\nTriple quote: \'\'\' embedded\nFinal line';

    await descCell.evaluate((el, value) => {
      const cmEl = el.querySelector('.CodeMirror');
      if (!cmEl) throw new Error('No CodeMirror in X-Plain description cell');
      const cm = (cmEl as any).CodeMirror;
      if (!cm) throw new Error('CodeMirror instance not found');
      cm.setValue(value);
    }, description);

    await expect(descCell.locator('.CodeMirror-line').nth(0)).toHaveText('Backslash-quote: \\\'end');
    await expect(descCell.locator('.CodeMirror-line').nth(1)).toHaveText('Triple quote: \'\'\' embedded');
    await expect(descCell.locator('.CodeMirror-line').nth(2)).toHaveText('Final line');

    await page.keyboard.press(saveShortcut);
    await expect(page.getByText('Request saved successfully')).toBeVisible({ timeout: 5000 });

    const bruPath = path.join(collectionFixturePath!, 'request-with-descriptions.bru');
    const fileContent = fs.readFileSync(bruPath, 'utf8');

    // the ''' delimiter is escaped so it can't be mistaken for the closing block delimiter
    expect(fileContent).toContain('\\\'\\\'\\\' embedded');
    // the pre-existing backslash-quote is doubled so decoding can tell it apart from the above
    expect(fileContent).toContain('\\\\\'end');

    // reopen the request from disk to verify the escaped value round-trips back exactly
    await buildCommonLocators(page).tabs.closeTab('request-with-descriptions').click({ force: true });
    await openRequest(page, COLLECTION, 'request-with-descriptions');
    await selectRequestPaneTab(page, 'Headers');

    const reopenedRow = page.getByTestId('request-headers-table').locator('tbody tr').filter({
      has: page.locator('[data-testid="column-name"] .CodeMirror-line', { hasText: 'X-Plain' })
    });
    const reopenedDescCell = reopenedRow.getByTestId('column-description');

    await expect(reopenedDescCell.locator('.CodeMirror-line').nth(0)).toHaveText('Backslash-quote: \\\'end');
    await expect(reopenedDescCell.locator('.CodeMirror-line').nth(1)).toHaveText('Triple quote: \'\'\' embedded');
    await expect(reopenedDescCell.locator('.CodeMirror-line').nth(2)).toHaveText('Final line');
  });
});
