import { test, expect } from '../../../playwright';

const openEnvironmentConfigure = async (page, envName: string) => {
  await page.locator('div.current-environment').click();
  await expect(page.locator('.dropdown-item').filter({ hasText: envName })).toBeVisible();
  await page.locator('.dropdown-item').filter({ hasText: envName }).click();
  await expect(page.locator('.current-environment').filter({ hasText: envName })).toBeVisible();
  await page.locator('div.current-environment').click();
  await expect(page.getByText('Configure', { exact: true })).toBeVisible();
  await page.getByText('Configure', { exact: true }).click();
  await expect(page.locator('.request-tab').filter({ hasText: 'Environments' })).toBeVisible();
};

/** Returns the description CodeMirror for the row identified by the given name-input index. */
const descriptionEditor = (page, index: number) => {
  const row = page.locator('tr').filter({ has: page.locator(`input[name="${index}.name"]`) });
  // Each var row has two CodeMirrors: value (nth 0) and description (nth 1)
  return row.locator('.CodeMirror').nth(1);
};

test.describe('Environment Variable Descriptions - Read', () => {
  test('reads single-line and multiline descriptions from a pre-existing environment file', async ({
    pageWithUserData: page
  }) => {
    test.setTimeout(30_000);

    const collection = page
      .getByTestId('collections')
      .locator('#sidebar-collection-name')
      .filter({ hasText: 'env-description' });
    await expect(collection).toBeVisible();
    await collection.click();

    await openEnvironmentConfigure(page, 'WithDescriptions');

    // row 0: host — single-line description
    await expect(page.locator('input[name="0.name"]')).toHaveValue('host');
    const hostDesc = descriptionEditor(page, 0);
    await expect(hostDesc).toBeVisible();
    await expect(hostDesc.locator('.CodeMirror-line').first()).toHaveText('Single-line desc');

    // row 1: token — multiline description (stored with literal newlines)
    await expect(page.locator('input[name="1.name"]')).toHaveValue('token');
    const tokenDesc = descriptionEditor(page, 1);
    await expect(tokenDesc).toBeVisible();
    // CodeMirror wraps each line in its own .CodeMirror-line element
    await expect(tokenDesc.locator('.CodeMirror-line').nth(0)).toHaveText('Line one');
    await expect(tokenDesc.locator('.CodeMirror-line').nth(1)).toHaveText('Line two');

    // row 2: plain — no description (editor is empty)
    await expect(page.locator('input[name="2.name"]')).toHaveValue('plain');
    const plainDesc = descriptionEditor(page, 2);
    await expect(plainDesc).toBeVisible();
    await expect(plainDesc.locator('.CodeMirror-line').first()).toHaveText('');
  });
});
