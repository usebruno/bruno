import { test, expect } from '../../../playwright';

const openCollectionSettings = async (page, collectionName: string) => {
  await page
    .locator('#sidebar-collection-name')
    .filter({ hasText: collectionName })
    .click();
  // The tab label always reads "Collection" regardless of the collection name
  await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'Collection' })).toBeVisible();
};

test.describe('Collection Settings Descriptions - Read', () => {
  test('reads descriptions from headers and vars in a pre-existing collection.bru', async ({
    pageWithUserData: page
  }) => {
    test.setTimeout(30_000);

    await openCollectionSettings(page, 'col-description');

    // ── Headers tab ──────────────────────────────────────────────────────────
    await page.locator('.tab.headers').click();

    // Each header row has three CodeMirrors: name (0), value (1), description (2)
    const headerRows = page.locator('table').first().locator('tbody tr');

    // row 0: X-Version — single-line description
    const versionDescEditor = headerRows.nth(0).locator('.CodeMirror').nth(2);
    await expect(versionDescEditor.locator('.CodeMirror-line').first()).toHaveText('Single-line header desc');

    // row 1: X-Multi — multiline description
    const multiDescEditor = headerRows.nth(1).locator('.CodeMirror').nth(2);
    await expect(multiDescEditor.locator('.CodeMirror-line').nth(0)).toHaveText('Header line one');
    await expect(multiDescEditor.locator('.CodeMirror-line').nth(1)).toHaveText('Header line two');

    // row 2: X-Plain — no description (editor is empty)
    const plainDescEditor = headerRows.nth(2).locator('.CodeMirror').nth(2);
    await expect(plainDescEditor.locator('.CodeMirror-line').first()).toHaveText('');

    // ── Vars tab ─────────────────────────────────────────────────────────────
    await page.locator('.tab.vars').click();

    // In the vars tab the pre-request VarsTable is the first <table>.
    // Var rows have two CodeMirrors: value (nth 0) and description (nth 1).
    // The name column uses a plain <input> (no CodeMirror).
    const varRows = page.locator('table').first().locator('tbody tr');

    // row 0: baseUrl — single-line description
    const baseUrlDescEditor = varRows.nth(0).locator('.CodeMirror').nth(1);
    await expect(baseUrlDescEditor.locator('.CodeMirror-line').first()).toHaveText('Single-line var desc');

    // row 1: apiKey — multiline description
    const apiKeyDescEditor = varRows.nth(1).locator('.CodeMirror').nth(1);
    await expect(apiKeyDescEditor.locator('.CodeMirror-line').nth(0)).toHaveText('Var line one');
    await expect(apiKeyDescEditor.locator('.CodeMirror-line').nth(1)).toHaveText('Var line two');

    // row 2: plain — no description
    const plainVarDescEditor = varRows.nth(2).locator('.CodeMirror').nth(1);
    await expect(plainVarDescEditor.locator('.CodeMirror-line').first()).toHaveText('');
  });
});
