import { test, expect, Page } from '../..';

export const buildWebsocketCommonLocators = (page: Page) => ({
  connectionControls: {
    connect: () => page.getByTestId('ws-connect-button'),
    disconnect: () => page.getByTestId('ws-disconnect-button')
  },
  runButton: () => page.getByTestId('run-button'),
  messages: () => page.locator('.ws-message'),
  messageText: (index: number) => page.getByTestId('ws-message-content').nth(index),
  /**
   * First message whose content matches `pattern`.
   *
   * Prefer this over `messageText(index)` when asserting on one specific message: an outgoing
   * message is recorded only once its write completes, so a fast peer's reply can be listed
   * above the message it answers and shift every index after it.
   */
  messageMatching: (pattern: RegExp | string) =>
    page.getByTestId('ws-message-content').filter({ hasText: pattern }).first(),
  errorMessage: () => page.getByTestId('ws-message-error'),
  message: {
    container: () => page.getByTestId('ws-messages-container'),
    addButton: () => page.getByTestId('ws-add-message'),
    headers: () => page.getByTestId(/^ws-message-header-/),
    header: (index: number) => page.getByTestId(`ws-message-header-${index}`),
    messageWrapper: (index: number) => page.getByTestId(`ws-message-${index}`),
    body: (index: number) => page.getByTestId(`ws-message-body-${index}`),
    editor: (index: number) => page.getByTestId(`ws-message-body-${index}`).locator('.CodeMirror'),
    editorPlaceholder: (index: number) =>
      page.getByTestId(`ws-message-body-${index}`).locator('.CodeMirror-placeholder'),
    editorCode: (index: number) => page.getByTestId(`ws-message-body-${index}`).locator('.CodeMirror-code'),
    labels: () => page.getByTestId(/^ws-message-label-/),
    label: (index: number) => page.getByTestId(`ws-message-label-${index}`),
    nameInputs: () => page.getByTestId(/^ws-message-name-input-/),
    nameInput: (index: number) => page.getByTestId(`ws-message-name-input-${index}`),
    nameTooltip: () => page.getByTestId('ws-message-name-tooltip'),
    prettifyAll: () => page.getByTestId('ws-prettify-all'),
    sendButton: (index: number) => page.getByTestId(`ws-send-msg-${index}`),
    deleteButton: (index: number) => page.getByTestId(`ws-delete-msg-${index}`),
    bodyModeSelector: (index: number) =>
      page.getByTestId(`ws-message-header-${index}`).getByTestId('ws-body-mode-selector'),
    bodyModeLabel: (index: number) =>
      page.getByTestId(`ws-message-header-${index}`).getByTestId('ws-body-mode-label'),
    bodyModeItem: (mode: 'json' | 'xml' | 'text') => page.getByTestId(`ws-body-mode-item-${mode}`)
  },
  toolbar: {
    latestFirst: () => page.getByRole('button', { name: 'Latest First' }),
    latestLast: () => page.getByRole('button', { name: 'Latest Last' }),
    clearResponse: () => page.getByTestId('response-clear-btn')
  }
});

/**
 * Closes the connection of the open ws request.
 *
 * Tests in a file share one app instance and one request, so a connection left open by an earlier
 * test hides the connect button from the next one — the pane renders connect or disconnect, never
 * both. Messages need no cleanup: connecting resets the list.
 */
export const disconnectWs = async (page: Page) => {
  await test.step('Disconnect the ws connection', async () => {
    const locators = buildWebsocketCommonLocators(page);
    const connect = locators.connectionControls.connect();
    const disconnect = locators.connectionControls.disconnect();

    // Neither button is rendered while the connection is opening or closing. Settle on one before
    // the check below, or a mid-transition pane reads as "not connected" and the disconnect is
    // skipped — the no-op this helper exists to avoid.
    await expect(connect.or(disconnect)).toBeVisible();

    if (await disconnect.isVisible()) {
      await disconnect.click();
      await connect.waitFor();
    }
  });
};

const buildLocators = (page: Page) => ({
  websocket: buildWebsocketCommonLocators(page)
});

/**
 * Rename a websocket message by double-clicking its label and typing a new name.
 * @param page - The page object
 * @param index - The zero-based index of the message in the list
 * @param name - The new message name
 */
export const renameWsMessage = async (page: Page, index: number, name: string) => {
  await test.step(`Rename websocket message ${index} to "${name}"`, async () => {
    const { websocket } = buildLocators(page);
    await websocket.message.label(index).dblclick();
    const nameInput = websocket.message.nameInput(index);
    await expect(nameInput).toBeVisible();
    await nameInput.selectText();
    await page.keyboard.type(name);
    await nameInput.press('Enter');
  });
};
