import { expect, test } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import { openRequest, saveRequest, closeAllCollections } from '../../utils/page/actions';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const COLLECTION_NAME = 'ws-multi-message-yml';
const MULTI_MSG_REQ = 'ws-multi-msg';
const SINGLE_MSG_REQ = 'ws-single-msg';
const MULTI_MSG_YML_PATH = join(__dirname, 'fixtures/collection/ws-multi-msg.yml');
const SINGLE_MSG_YML_PATH = join(__dirname, 'fixtures/collection/ws-single-msg.yml');
const MAX_CONNECTION_TIME = 3000;

test.describe.serial('websocket multi-message (yml format)', () => {
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
    const { websocket, runner } = buildCommonLocators(page);
    await openRequest(page, COLLECTION_NAME, SINGLE_MSG_REQ);

    // The old format (message: { type, data }) should load as a single accordion
    await expect(websocket.message.headers()).toHaveCount(1);

    // Expand the first message if not already expanded
    if (!(await websocket.message.body(0).isVisible())) {
      await websocket.message.header(0).click();
    }
    await expect(websocket.message.body(0)).toBeVisible();

    // Verify the type is correctly read from the old format
    await expect(websocket.message.header(0).locator('.selected-body-mode')).toContainText('JSON');

    // Add a second message to trigger format migration
    await websocket.message.addButton().click();
    const nameInput = websocket.message.nameInputs();
    await expect(nameInput).toBeVisible();
    await nameInput.selectText();
    await page.keyboard.type('new message');
    await nameInput.press('Enter');

    await saveRequest(page);

    // Verify the yml file now uses the array format (WebSocketMessageVariant[])
    const ymlContent = await readFile(SINGLE_MSG_YML_PATH, 'utf8');
    expect(ymlContent).toContain('- title:');
    expect(ymlContent).toContain('new message');

    // Re-open to verify it still loads correctly after format migration
    await openRequest(page, COLLECTION_NAME, MULTI_MSG_REQ);
    await openRequest(page, COLLECTION_NAME, SINGLE_MSG_REQ);

    await expect(websocket.message.headers()).toHaveCount(2);
  });

  test('add a new message and save', async ({ pageWithUserData: page }) => {
    const { websocket, runner } = buildCommonLocators(page);
    await openRequest(page, COLLECTION_NAME, MULTI_MSG_REQ);

    await websocket.message.addButton().click();

    const nameInput = websocket.message.nameInputs();
    await expect(nameInput).toBeVisible();

    await nameInput.selectText();
    await page.keyboard.type('ping message');
    await nameInput.press('Enter');

    await expect(websocket.message.labels().filter({ hasText: 'ping message' })).toBeVisible();
    await expect(websocket.message.headers()).toHaveCount(3);

    await saveRequest(page);

    const ymlContent = await readFile(MULTI_MSG_YML_PATH, 'utf8');
    expect(ymlContent).toContain('ping message');
  });

  test('edit message content and verify persistence', async ({ pageWithUserData: page }) => {
    const { websocket, runner } = buildCommonLocators(page);
    const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

    await openRequest(page, COLLECTION_NAME, SINGLE_MSG_REQ);

    // Expand the first message if not already expanded
    if (!(await websocket.message.body(0).isVisible())) {
      await websocket.message.header(0).click();
    }
    const editor = websocket.message.editor(0);
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
    const { websocket, runner } = buildCommonLocators(page);
    await openRequest(page, COLLECTION_NAME, MULTI_MSG_REQ);

    const firstHeader = websocket.message.header(0);
    await expect(firstHeader.locator('.selected-body-mode')).toContainText('JSON');

    const secondHeader = websocket.message.header(1);
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

    await expect(websocket.message.header(0).locator('.selected-body-mode')).toContainText('XML');
    await expect(websocket.message.header(1).locator('.selected-body-mode')).toContainText('TEXT');
  });

  test('send selected message to active connection', async ({ pageWithUserData: page }) => {
    const { websocket, runner } = buildCommonLocators(page);

    await openRequest(page, COLLECTION_NAME, MULTI_MSG_REQ);

    await websocket.connectionControls.connect().click();
    await expect(websocket.connectionControls.disconnect()).toBeAttached({
      timeout: MAX_CONNECTION_TIME
    });

    const messageItems = websocket.messages().locator('.text-ellipsis');
    const beforeCount = await messageItems.count();

    // Click the main send button — sends the currently selected message
    await runner().click();

    // Expect at least one new message (outgoing + echo response from server)
    await expect.poll(() => messageItems.count(), { timeout: MAX_CONNECTION_TIME }).toBeGreaterThan(beforeCount);

    await websocket.connectionControls.disconnect().click();
    await expect(websocket.connectionControls.connect()).toBeVisible();
  });

  test('first message is implicitly selected when no message is marked selected', async ({ pageWithUserData: page }) => {
    const { websocket, runner } = buildCommonLocators(page);

    await openRequest(page, COLLECTION_NAME, MULTI_MSG_REQ);

    // ws-multi-msg.yml has two messages with no `selected: true` flag. The
    // main send button should therefore dispatch the first message.
    await websocket.connectionControls.connect().click();
    await expect(websocket.connectionControls.disconnect()).toBeAttached({
      timeout: MAX_CONNECTION_TIME
    });

    await runner().click();

    // the first message's content ("subscribe"), and none should carry the
    // second message's content ("hello world").
    await expect(websocket.messages().filter({ hasText: 'subscribe' }).first()).toBeAttached({
      timeout: MAX_CONNECTION_TIME
    });
    await expect(websocket.messages().filter({ hasText: 'hello world' })).toHaveCount(0);

    await websocket.connectionControls.disconnect().click();
  });

  test('selecting a different message routes run-button to that message', async ({ pageWithUserData: page }) => {
    const { websocket, runner } = buildCommonLocators(page);

    await openRequest(page, COLLECTION_NAME, MULTI_MSG_REQ);

    // Select the second message by clicking its header
    await websocket.message.header(1).click();

    await websocket.connectionControls.connect().click();
    await expect(websocket.connectionControls.disconnect()).toBeAttached({
      timeout: MAX_CONNECTION_TIME
    });

    await runner().click();

    await expect(websocket.messages().filter({ hasText: 'hello world' }).first()).toBeAttached({
      timeout: MAX_CONNECTION_TIME
    });
    await expect(websocket.messages().filter({ hasText: 'subscribe' })).toHaveCount(0);

    await websocket.connectionControls.disconnect().click();
  });

  test('per-message send button sends that specific message', async ({ pageWithUserData: page }) => {
    const { websocket, runner } = buildCommonLocators(page);

    await openRequest(page, COLLECTION_NAME, MULTI_MSG_REQ);

    // Hover the header to reveal hover-actions, then click the second
    // message's send button
    await websocket.message.header(1).hover();
    await websocket.message.sendButton(1).click();

    await expect(websocket.connectionControls.disconnect()).toBeAttached({
      timeout: MAX_CONNECTION_TIME
    });
    await expect(websocket.messages().filter({ hasText: 'hello world' }).first()).toBeAttached({
      timeout: MAX_CONNECTION_TIME
    });

    await websocket.connectionControls.disconnect().click();
  });

  test('prettify json message content', async ({ pageWithUserData: page }) => {
    const { websocket, runner } = buildCommonLocators(page);
    const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

    await openRequest(page, COLLECTION_NAME, SINGLE_MSG_REQ);

    // Expand the first message if not already expanded
    if (!(await websocket.message.body(0).isVisible())) {
      await websocket.message.header(0).click();
    }
    const editor = websocket.message.editor(0);
    await editor.click();
    const textarea = editor.locator('textarea');
    await textarea.focus();
    await page.keyboard.press(selectAllShortcut);
    await page.keyboard.insertText('{"name":"bruno","version":"1.0"}');

    await websocket.message.prettifyAll().click();

    // Verify prettification split single line into multiple lines
    const lineNumbers = await editor.locator('.CodeMirror-linenumber').count();
    expect(lineNumbers).toBeGreaterThan(1);
  });

  test('delete a message', async ({ pageWithUserData: page }) => {
    const { websocket, runner } = buildCommonLocators(page);
    await openRequest(page, COLLECTION_NAME, MULTI_MSG_REQ);

    await expect(websocket.message.headers()).toHaveCount(2);

    // Hover over the message header to reveal the delete button
    await websocket.message.header(1).hover();
    await websocket.message.deleteButton(1).click();

    await expect(websocket.message.headers()).toHaveCount(1);

    await saveRequest(page);

    const ymlContent = await readFile(MULTI_MSG_YML_PATH, 'utf8');
    const titleCount = (ymlContent.match(/- title:/g) || []).length;
    expect(titleCount).toBeLessThanOrEqual(1);
  });

  test('rename a message via double-click', async ({ pageWithUserData: page }) => {
    const { websocket, runner } = buildCommonLocators(page);
    await openRequest(page, COLLECTION_NAME, MULTI_MSG_REQ);

    await websocket.message.label(0).dblclick();

    const nameInput = websocket.message.nameInput(0);
    await expect(nameInput).toBeVisible();

    await nameInput.selectText();
    await page.keyboard.type('subscribe request');
    await nameInput.press('Enter');

    await expect(websocket.message.label(0).filter({ hasText: 'subscribe request' })).toBeVisible();

    await saveRequest(page);

    const ymlContent = await readFile(MULTI_MSG_YML_PATH, 'utf8');
    expect(ymlContent).toContain('subscribe request');
  });

  test('rename a message and save with the keyboard shortcut while editing', async ({ pageWithUserData: page }) => {
    const { websocket, runner } = buildCommonLocators(page);
    const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';

    await openRequest(page, COLLECTION_NAME, SINGLE_MSG_REQ);

    await websocket.message.label(0).dblclick();

    const nameInput = websocket.message.nameInput(0);
    await expect(nameInput).toBeVisible();

    await nameInput.selectText();
    await page.keyboard.type('renamed via shortcut');

    // Press cmd/ctrl+s while the name input still has focus, without pressing
    // Enter or blurring first. This must commit the pending name and persist it.
    await nameInput.press(saveShortcut);

    // The editing input closes and the new name is committed to the UI.
    await expect(websocket.message.label(0).filter({ hasText: 'renamed via shortcut' })).toBeVisible();

    // The rename must be written to disk by the shortcut-triggered save.
    await expect
      .poll(async () => await readFile(SINGLE_MSG_YML_PATH, 'utf8'))
      .toContain('renamed via shortcut');
  });
});
