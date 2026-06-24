import { test, expect } from '../../../playwright';

const openFolderSettings = async (page, collectionName: string, folderName = 'api') => {
  const collectionRow = page.locator('#sidebar-collection-name').filter({ hasText: collectionName });
  await expect(collectionRow).toBeVisible();

  const folderRow = page
    .getByTestId('collections')
    .locator('.collection-item-name')
    .filter({ hasText: folderName });
  if (!(await folderRow.isVisible().catch(() => false))) {
    await collectionRow.click();
    await expect(folderRow).toBeVisible();
  }

  await folderRow.dblclick();
  await expect(page.locator('.request-tab .tab-label').filter({ hasText: folderName })).toBeVisible();
};

test.describe('Folder Settings Descriptions - Read', () => {
  test('reads descriptions from headers and vars in a pre-existing folder.bru', async ({
    pageWithUserData: page
  }) => {
    test.setTimeout(30_000);

    await openFolderSettings(page, 'fold-description');

    await page.getByTestId('folder-settings-tab-headers').click();

    const headerRows = page.locator('table').first().locator('tbody tr');

    const versionDescEditor = headerRows.nth(0).getByTestId('column-description').locator('.CodeMirror');
    await expect(versionDescEditor.locator('.CodeMirror-line').first()).toHaveText('Single-line header desc');

    const multiDescEditor = headerRows.nth(1).getByTestId('column-description').locator('.CodeMirror');
    await expect(multiDescEditor.locator('.CodeMirror-line').nth(0)).toHaveText('Header line one');
    await expect(multiDescEditor.locator('.CodeMirror-line').nth(1)).toHaveText('Header line two');

    const plainDescEditor = headerRows.nth(2).getByTestId('column-description').locator('.CodeMirror');
    await expect(plainDescEditor.locator('.CodeMirror-line').first()).toHaveText('');

    await page.getByTestId('folder-settings-tab-vars').click();

    const varRows = page.getByTestId('folder-vars-req').locator('tbody tr');

    const baseUrlDescEditor = varRows.nth(0).locator('.CodeMirror').nth(1);
    await expect(baseUrlDescEditor.locator('.CodeMirror-line').first()).toHaveText('Single-line var desc');

    const apiKeyDescEditor = varRows.nth(1).locator('.CodeMirror').nth(1);
    await expect(apiKeyDescEditor.locator('.CodeMirror-line').nth(0)).toHaveText('Var line one');
    await expect(apiKeyDescEditor.locator('.CodeMirror-line').nth(1)).toHaveText('Var line two');

    const plainVarDescEditor = varRows.nth(2).locator('.CodeMirror').nth(1);
    await expect(plainVarDescEditor.locator('.CodeMirror-line').first()).toHaveText('');
  });
});
