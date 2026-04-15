import { expect, test } from '../../../playwright';
import { buildWebsocketCommonLocators } from '../../utils/page/locators';
import { openRequest, saveRequest, closeAllCollections } from '../../utils/page/actions';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const COLLECTION_NAME = 'ws-multi-message';
const MULTI_MSG_REQ = 'ws-multi-msg';
const SINGLE_MSG_REQ = 'ws-single-msg';
const MULTI_MSG_BRU_PATH = join(__dirname, 'fixtures/collection/ws-multi-msg.bru');
const SINGLE_MSG_BRU_PATH = join(__dirname, 'fixtures/collection/ws-single-msg.bru');
const MAX_CONNECTION_TIME = 3000;

test.describe('websocket multi-message (bru format)', () => {
  let originalMultiMsgData = '';
  let originalSingleMsgData = '';

  test.beforeAll(async () => {
    originalMultiMsgData = await readFile(MULTI_MSG_BRU_PATH, 'utf8');
    originalSingleMsgData = await readFile(SINGLE_MSG_BRU_PATH, 'utf8');
  });

  test.afterEach(async () => {
    await writeFile(MULTI_MSG_BRU_PATH, originalMultiMsgData, 'utf8');
    await writeFile(SINGLE_MSG_BRU_PATH, originalSingleMsgData, 'utf8');
  });

  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
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

    const bruContent = await readFile(MULTI_MSG_BRU_PATH, 'utf8');
    expect(bruContent).toContain('name: ping message');
  });

  test('edit message content and verify persistence', async ({ pageWithUserData: page }) => {
    const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

    await openRequest(page, COLLECTION_NAME, SINGLE_MSG_REQ);

    // First message is already expanded by default
    const editorBody = page.getByTestId('ws-message-body-0');
    const editor = editorBody.locator('.CodeMirror');
    await editor.click();
    const textarea = editor.locator('textarea');
    await textarea.focus();
    await page.keyboard.press(selectAllShortcut);
    await page.keyboard.insertText('{"updated": "content"}');

    await saveRequest(page);

    const bruContent = await readFile(SINGLE_MSG_BRU_PATH, 'utf8');
    expect(bruContent).toContain('{"updated": "content"}');
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

    const bruContent = await readFile(MULTI_MSG_BRU_PATH, 'utf8');
    expect(bruContent).toContain('type: xml');
    expect(bruContent).toContain('type: text');

    // Re-open to verify persistence
    await openRequest(page, COLLECTION_NAME, SINGLE_MSG_REQ);
    await openRequest(page, COLLECTION_NAME, MULTI_MSG_REQ);

    await expect(page.getByTestId('ws-message-header-0').locator('.selected-body-mode')).toContainText('XML');
    await expect(page.getByTestId('ws-message-header-1').locator('.selected-body-mode')).toContainText('TEXT');
  });

  test('send selected message to active connection', async ({ pageWithUserData: page }) => {
    const locators = buildWebsocketCommonLocators(page);

    await openRequest(page, COLLECTION_NAME, MULTI_MSG_REQ);

    await locators.connectionControls.connect().click();
    await expect(locators.connectionControls.disconnect()).toBeAttached({
      timeout: MAX_CONNECTION_TIME
    });

    const messageItems = locators.messages().locator('.text-ellipsis');
    const beforeCount = await messageItems.count();

    // Click the main send button — sends the currently selected message
    await page.getByTestId('run-button').click();

    // Expect at least one new message (outgoing + echo response from server)
    await expect.poll(() => messageItems.count(), { timeout: MAX_CONNECTION_TIME }).toBeGreaterThan(beforeCount);

    await locators.connectionControls.disconnect().click();
    await expect(locators.connectionControls.connect()).toBeVisible();
  });

  test('prettify json message content', async ({ pageWithUserData: page }) => {
    const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

    await openRequest(page, COLLECTION_NAME, SINGLE_MSG_REQ);

    // First message is already expanded by default
    const editorBody = page.getByTestId('ws-message-body-0');
    const editor = editorBody.locator('.CodeMirror');
    await editor.click();
    const textarea = editor.locator('textarea');
    await textarea.focus();
    await page.keyboard.press(selectAllShortcut);
    await page.keyboard.insertText('{"name":"bruno","version":"1.0"}');

    await page.getByTestId('ws-prettify-all').click();

    // Verify prettification split single line into multiple lines
    const lineNumbers = await editor.locator('.CodeMirror-linenumber').count();
    expect(lineNumbers).toBeGreaterThan(1);
  });

  test('delete a message', async ({ pageWithUserData: page }) => {
    await openRequest(page, COLLECTION_NAME, MULTI_MSG_REQ);

    await expect(page.getByTestId(/^ws-message-header-/)).toHaveCount(2);

    await page.getByTestId('ws-delete-msg-1').click();

    await expect(page.getByTestId(/^ws-message-header-/)).toHaveCount(1);

    await saveRequest(page);

    const bruContent = await readFile(MULTI_MSG_BRU_PATH, 'utf8');
    const bodyWsCount = (bruContent.match(/body:ws/g) || []).length;
    expect(bodyWsCount).toBe(1);
  });

  test('rename a message via double-click', async ({ pageWithUserData: page }) => {
    await openRequest(page, COLLECTION_NAME, SINGLE_MSG_REQ);

    const messageLabel = page.getByTestId('ws-message-label-0');
    await messageLabel.dblclick();

    const nameInput = page.getByTestId('ws-message-name-input-0');
    await expect(nameInput).toBeVisible();

    await nameInput.fill('subscribe request');
    await nameInput.press('Enter');

    await expect(page.getByTestId('ws-message-label-0').filter({ hasText: 'subscribe request' })).toBeVisible();

    await saveRequest(page);

    const bruContent = await readFile(SINGLE_MSG_BRU_PATH, 'utf8');
    expect(bruContent).toContain('name: subscribe request');
  });
});
