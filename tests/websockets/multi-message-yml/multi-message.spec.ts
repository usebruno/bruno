import { expect, test } from '../../../playwright';
import { buildWebsocketCommonLocators } from '../../utils/page/locators';
import { openRequest, saveRequest, closeAllCollections } from '../../utils/page/actions';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const COLLECTION_NAME = 'ws-multi-message-yml';
const MULTI_MSG_REQ = 'ws-multi-msg';
const SINGLE_MSG_REQ = 'ws-single-msg';
const MULTI_MSG_YML_PATH = join(__dirname, 'fixtures/collection/ws-multi-msg.yml');
const SINGLE_MSG_YML_PATH = join(__dirname, 'fixtures/collection/ws-single-msg.yml');
const MAX_CONNECTION_TIME = 3000;

test.describe('websocket multi-message (yml format)', () => {
  let originalMultiMsgData = '';
  let originalSingleMsgData = '';

  test.beforeAll(async () => {
    originalMultiMsgData = await readFile(MULTI_MSG_YML_PATH, 'utf8');
    originalSingleMsgData = await readFile(SINGLE_MSG_YML_PATH, 'utf8');
  });

  test.afterEach(async () => {
    await writeFile(MULTI_MSG_YML_PATH, originalMultiMsgData, 'utf8');
    await writeFile(SINGLE_MSG_YML_PATH, originalSingleMsgData, 'utf8');
  });

  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('backward compatibility: old single-message format loads correctly', async ({ pageWithUserData: page }) => {
    await openRequest(page, COLLECTION_NAME, SINGLE_MSG_REQ);

    // The old format (message: { type, data }) should load as a single accordion
    await expect(page.getByTestId(/^ws-message-header-/)).toHaveCount(1);

    // The first message should be expanded with content visible
    await expect(page.getByTestId('ws-message-body-0')).toBeVisible();

    // Verify the type is correctly read from the old format
    await expect(page.getByTestId('ws-message-header-0').locator('.selected-body-mode')).toContainText('JSON');

    // Add a second message to trigger format migration
    await page.getByTestId('ws-add-message').click();
    const nameInput = page.getByTestId(/^ws-message-name-input-/);
    await nameInput.fill('new message');
    await nameInput.press('Enter');

    await saveRequest(page);

    // Verify the yml file now uses the array format (WebSocketMessageVariant[])
    const ymlContent = await readFile(SINGLE_MSG_YML_PATH, 'utf8');
    expect(ymlContent).toContain('- title:');
    expect(ymlContent).toContain('new message');

    // Re-open to verify it still loads correctly after format migration
    await openRequest(page, COLLECTION_NAME, MULTI_MSG_REQ);
    await openRequest(page, COLLECTION_NAME, SINGLE_MSG_REQ);

    await expect(page.getByTestId(/^ws-message-header-/)).toHaveCount(2);
  });

  test('add a new message and save', async ({ pageWithUserData: page }) => {
    await openRequest(page, COLLECTION_NAME, MULTI_MSG_REQ);

    await page.getByTestId('ws-add-message').click();

    const nameInput = page.getByTestId(/^ws-message-name-input-/);
    await expect(nameInput).toBeVisible();

    await nameInput.fill('ping message');
    await nameInput.press('Enter');

    await expect(page.getByTestId(/^ws-message-label-/).filter({ hasText: 'ping message' })).toBeVisible();
    await expect(page.getByTestId(/^ws-message-header-/)).toHaveCount(3);

    await saveRequest(page);

    const ymlContent = await readFile(MULTI_MSG_YML_PATH, 'utf8');
    expect(ymlContent).toContain('ping message');
  });

  test('edit message content and verify persistence', async ({ pageWithUserData: page }) => {
    const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

    await openRequest(page, COLLECTION_NAME, SINGLE_MSG_REQ);

    const editorBody = page.getByTestId('ws-message-body-0');
    const editor = editorBody.locator('.CodeMirror');
    await editor.click();
    const textarea = editor.locator('textarea');
    await textarea.focus();
    await page.keyboard.press(selectAllShortcut);
    await page.keyboard.insertText('{"updated": "content"}');

    await saveRequest(page);

    const ymlContent = await readFile(SINGLE_MSG_YML_PATH, 'utf8');
    expect(ymlContent).toContain('{"updated": "content"}');
  });

  test('messages with different types persist correctly', async ({ pageWithUserData: page }) => {
    await openRequest(page, COLLECTION_NAME, MULTI_MSG_REQ);

    const firstHeader = page.getByTestId('ws-message-header-0');
    await expect(firstHeader.locator('.selected-body-mode')).toContainText('JSON');

    const secondHeader = page.getByTestId('ws-message-header-1');
    await expect(secondHeader.locator('.selected-body-mode')).toContainText('TEXT');

    // Change message 1 type from json to xml
    await firstHeader.locator('.body-mode-selector').click();
    await page.locator('.dropdown-item').filter({ hasText: 'XML' }).click();

    await expect(firstHeader.locator('.selected-body-mode')).toContainText('XML');

    await saveRequest(page);

    const ymlContent = await readFile(MULTI_MSG_YML_PATH, 'utf8');
    expect(ymlContent).toContain('type: xml');
    expect(ymlContent).toContain('type: text');

    // Re-open to verify persistence
    await openRequest(page, COLLECTION_NAME, SINGLE_MSG_REQ);
    await openRequest(page, COLLECTION_NAME, MULTI_MSG_REQ);

    await expect(page.getByTestId('ws-message-header-0').locator('.selected-body-mode')).toContainText('XML');
    await expect(page.getByTestId('ws-message-header-1').locator('.selected-body-mode')).toContainText('TEXT');
  });

  test('send individual message to active connection', async ({ pageWithUserData: page }) => {
    const locators = buildWebsocketCommonLocators(page);

    await openRequest(page, COLLECTION_NAME, MULTI_MSG_REQ);

    await locators.connectionControls.connect().click();
    await expect(locators.connectionControls.disconnect()).toBeAttached({
      timeout: MAX_CONNECTION_TIME
    });

    await page.getByTestId('ws-send-msg-0').click();

    await expect(locators.messages().locator('.text-ellipsis').first()).toBeAttached({ timeout: 3000 });

    await locators.connectionControls.disconnect().click();
    await expect(locators.connectionControls.connect()).toBeVisible();
  });

  test('prettify json message content', async ({ pageWithUserData: page }) => {
    const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

    await openRequest(page, COLLECTION_NAME, SINGLE_MSG_REQ);

    const editorBody = page.getByTestId('ws-message-body-0');
    const editor = editorBody.locator('.CodeMirror');
    await editor.click();
    const textarea = editor.locator('textarea');
    await textarea.focus();
    await page.keyboard.press(selectAllShortcut);
    await page.keyboard.insertText('{"name":"bruno","version":"1.0"}');

    await page.getByTestId('ws-prettify-msg-0').click();

    const editorContent = await editor.locator('.CodeMirror-code').textContent();
    expect(editorContent).toContain('"name"');
    expect(editorContent).toContain('"bruno"');
  });

  test('delete a message', async ({ pageWithUserData: page }) => {
    await openRequest(page, COLLECTION_NAME, MULTI_MSG_REQ);

    await expect(page.getByTestId(/^ws-message-header-/)).toHaveCount(2);

    await page.getByTestId('ws-delete-msg-1').click();

    await expect(page.getByTestId(/^ws-message-header-/)).toHaveCount(1);

    await saveRequest(page);

    const ymlContent = await readFile(MULTI_MSG_YML_PATH, 'utf8');
    const titleCount = (ymlContent.match(/- title:/g) || []).length;
    expect(titleCount).toBeLessThanOrEqual(1);
  });

  test('rename a message via double-click', async ({ pageWithUserData: page }) => {
    await openRequest(page, COLLECTION_NAME, MULTI_MSG_REQ);

    const messageLabel = page.getByTestId('ws-message-label-0');
    await messageLabel.dblclick();

    const nameInput = page.getByTestId('ws-message-name-input-0');
    await expect(nameInput).toBeVisible();

    await nameInput.fill('subscribe request');
    await nameInput.press('Enter');

    await expect(page.getByTestId('ws-message-label-0').filter({ hasText: 'subscribe request' })).toBeVisible();

    await saveRequest(page);

    const ymlContent = await readFile(MULTI_MSG_YML_PATH, 'utf8');
    expect(ymlContent).toContain('subscribe request');
  });
});
