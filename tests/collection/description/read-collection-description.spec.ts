import { test, expect } from '../../../playwright';
import { openCollectionSettings, focusCollectionSettingsTab, selectCollectionPaneTab } from '../../utils/page';

test.describe('Collection Settings Descriptions - Read', () => {
  test('reads descriptions from headers and vars in a pre-existing collection.bru', async ({
    pageWithUserData: page
  }) => {
    await openCollectionSettings(page, 'col-description');
    await focusCollectionSettingsTab(page);

    await selectCollectionPaneTab(page, 'headers');

    const headerRows = page.getByTestId('collection-headers').locator('tbody tr');

    const versionDescEditor = headerRows.nth(0).getByTestId('column-description').locator('.CodeMirror');
    await expect(versionDescEditor.locator('.CodeMirror-line').first()).toHaveText('Single-line header desc');

    const multiDescEditor = headerRows.nth(1).getByTestId('column-description').locator('.CodeMirror');
    await expect(multiDescEditor.locator('.CodeMirror-line').nth(0)).toHaveText('Header line one');
    await expect(multiDescEditor.locator('.CodeMirror-line').nth(1)).toHaveText('Header line two');

    const plainDescEditor = headerRows.nth(2).getByTestId('column-description').locator('.CodeMirror');
    await expect(plainDescEditor.locator('.CodeMirror-line').first()).toHaveText('');

    await selectCollectionPaneTab(page, 'vars');

    const varRows = page.getByTestId('collection-vars-req').locator('tbody tr');

    const baseUrlDescEditor = varRows.nth(0).getByTestId('column-description').locator('.CodeMirror');
    await expect(baseUrlDescEditor.locator('.CodeMirror-line').first()).toHaveText('Single-line var desc');

    const apiKeyDescEditor = varRows.nth(1).getByTestId('column-description').locator('.CodeMirror');
    await expect(apiKeyDescEditor.locator('.CodeMirror-line').nth(0)).toHaveText('Var line one');
    await expect(apiKeyDescEditor.locator('.CodeMirror-line').nth(1)).toHaveText('Var line two');

    const plainVarDescEditor = varRows.nth(2).getByTestId('column-description').locator('.CodeMirror');
    await expect(plainVarDescEditor.locator('.CodeMirror-line').first()).toHaveText('');
  });
});
