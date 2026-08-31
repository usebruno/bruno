import { test, expect } from '../../../playwright';
import { openRequest, selectRequestPaneTab } from '../../utils/page';

const COLLECTION = 'req-description';

test.describe('Request Description - Read', () => {
  test('reads descriptions from request headers in a pre-existing .bru file', async ({
    pageWithUserData: page
  }) => {
    test.setTimeout(30_000);

    await openRequest(page, COLLECTION, 'request-with-descriptions');
    await selectRequestPaneTab(page, 'Headers');

    const headersTable = page.getByTestId('request-headers-table');
    const rows = headersTable.locator('tbody tr');

    // row 0: X-Version — single-line description
    const versionDescEditor = rows.nth(0).getByTestId('column-description').locator('.CodeMirror');
    await expect(versionDescEditor.locator('.CodeMirror-line').first()).toHaveText('Single-line header desc');

    // row 1: X-Multi — multiline description
    const multiDescEditor = rows.nth(1).getByTestId('column-description').locator('.CodeMirror');
    await expect(multiDescEditor.locator('.CodeMirror-line').nth(0)).toHaveText('Header line one');
    await expect(multiDescEditor.locator('.CodeMirror-line').nth(1)).toHaveText('Header line two');

    // row 2: X-Plain — no description (editor is empty)
    const plainDescEditor = rows.nth(2).getByTestId('column-description').locator('.CodeMirror');
    await expect(plainDescEditor.locator('.CodeMirror-line').first()).toHaveText('');
  });

  test('reads descriptions from request query params in a pre-existing .bru file', async ({
    pageWithUserData: page
  }) => {
    test.setTimeout(30_000);

    await openRequest(page, COLLECTION, 'request-with-descriptions');
    await selectRequestPaneTab(page, 'Params');

    const queryTable = page.getByTestId('query-params-table');
    const rows = queryTable.locator('tbody tr');

    // row 0: q — single-line description
    const qDescEditor = rows.nth(0).getByTestId('column-description').locator('.CodeMirror');
    await expect(qDescEditor.locator('.CodeMirror-line').first()).toHaveText('Single-line query desc');

    // row 1: page — multiline description
    const pageDescEditor = rows.nth(1).getByTestId('column-description').locator('.CodeMirror');
    await expect(pageDescEditor.locator('.CodeMirror-line').nth(0)).toHaveText('Multi-line query desc line one');
    await expect(pageDescEditor.locator('.CodeMirror-line').nth(1)).toHaveText('Multi-line query desc line two');

    // row 2: plain-query — no description
    const plainDescEditor = rows.nth(2).getByTestId('column-description').locator('.CodeMirror');
    await expect(plainDescEditor.locator('.CodeMirror-line').first()).toHaveText('');
  });

  test('reads descriptions from multipart form fields in a pre-existing .bru file', async ({
    pageWithUserData: page
  }) => {
    test.setTimeout(30_000);

    await openRequest(page, COLLECTION, 'multipart-with-descriptions');
    await selectRequestPaneTab(page, 'Body');

    const multipartTable = page.getByTestId('multipart-form-table');
    const rows = multipartTable.locator('tbody tr');

    // row 0: username — single-line description
    const usernameDescEditor = rows.nth(0).getByTestId('column-description').locator('.CodeMirror');
    await expect(usernameDescEditor.locator('.CodeMirror-line').first()).toHaveText('Single-line field desc');

    // row 1: email — multiline description
    const emailDescEditor = rows.nth(1).getByTestId('column-description').locator('.CodeMirror');
    await expect(emailDescEditor.locator('.CodeMirror-line').nth(0)).toHaveText('Multi-line field desc line one');
    await expect(emailDescEditor.locator('.CodeMirror-line').nth(1)).toHaveText('Multi-line field desc line two');

    // row 2: plain-field — no description
    const plainDescEditor = rows.nth(2).getByTestId('column-description').locator('.CodeMirror');
    await expect(plainDescEditor.locator('.CodeMirror-line').first()).toHaveText('');
  });

  test('reads descriptions from form-urlencoded fields in a pre-existing .bru file', async ({
    pageWithUserData: page
  }) => {
    test.setTimeout(30_000);

    await openRequest(page, COLLECTION, 'formurlencoded-with-descriptions');
    await selectRequestPaneTab(page, 'Body');

    const formTable = page.getByTestId('form-urlencoded-table');
    const rows = formTable.locator('tbody tr');

    // row 0: username — single-line description
    const usernameDescEditor = rows.nth(0).getByTestId('column-description').locator('.CodeMirror');
    await expect(usernameDescEditor.locator('.CodeMirror-line').first()).toHaveText('Single-line form desc');

    // row 1: password — multiline description
    const passwordDescEditor = rows.nth(1).getByTestId('column-description').locator('.CodeMirror');
    await expect(passwordDescEditor.locator('.CodeMirror-line').nth(0)).toHaveText('Multi-line form desc line one');
    await expect(passwordDescEditor.locator('.CodeMirror-line').nth(1)).toHaveText('Multi-line form desc line two');

    // row 2: plain-field — no description
    const plainDescEditor = rows.nth(2).getByTestId('column-description').locator('.CodeMirror');
    await expect(plainDescEditor.locator('.CodeMirror-line').first()).toHaveText('');
  });

  test('reads descriptions from request vars in a pre-existing .bru file', async ({
    pageWithUserData: page
  }) => {
    test.setTimeout(30_000);

    await openRequest(page, COLLECTION, 'request-with-descriptions');
    await selectRequestPaneTab(page, 'Vars');

    const varsTable = page.getByTestId('request-vars-req');
    const rows = varsTable.locator('tbody tr');

    const apiKeyDescEditor = rows.nth(0).getByTestId('column-description').locator('.CodeMirror');
    await expect(apiKeyDescEditor.locator('.CodeMirror-line').first()).toHaveText('Single-line var desc');

    const baseUrlDescEditor = rows.nth(1).getByTestId('column-description').locator('.CodeMirror');
    await expect(baseUrlDescEditor.locator('.CodeMirror-line').nth(0)).toHaveText('Multi-line var desc line one');
    await expect(baseUrlDescEditor.locator('.CodeMirror-line').nth(1)).toHaveText('Multi-line var desc line two');

    const plainDescEditor = rows.nth(2).getByTestId('column-description').locator('.CodeMirror');
    await expect(plainDescEditor.locator('.CodeMirror-line').first()).toHaveText('');
  });

  test('reads descriptions from request assertions in a pre-existing .bru file', async ({
    pageWithUserData: page
  }) => {
    test.setTimeout(30_000);

    await openRequest(page, COLLECTION, 'request-with-descriptions');
    await selectRequestPaneTab(page, 'Assert');

    const assertionsTable = page.getByTestId('assertions-table');
    const rows = assertionsTable.locator('tbody tr');

    const statusDescEditor = rows.nth(0).getByTestId('column-description').locator('.CodeMirror');
    await expect(statusDescEditor.locator('.CodeMirror-line').first()).toHaveText('Single-line assert desc');

    const bodyDescEditor = rows.nth(1).getByTestId('column-description').locator('.CodeMirror');
    await expect(bodyDescEditor.locator('.CodeMirror-line').nth(0)).toHaveText('Multi-line assert line one');
    await expect(bodyDescEditor.locator('.CodeMirror-line').nth(1)).toHaveText('Multi-line assert line two');

    const plainDescEditor = rows.nth(2).getByTestId('column-description').locator('.CodeMirror');
    await expect(plainDescEditor.locator('.CodeMirror-line').first()).toHaveText('');
  });
});
