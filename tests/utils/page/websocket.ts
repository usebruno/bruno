import { Page, test, expect } from '../../../playwright';

export const buildWebsocketCommonLocators = (page: Page) => ({
  connectionControls: {
    connect: () => page.getByTestId('ws-connect-button'),
    disconnect: () => page.getByTestId('ws-disconnect-button')
  },
  runButton: () => page.getByTestId('run-button'),
  messages: () => page.locator('.ws-message'),
  messageText: (index: number) => page.getByTestId('ws-message-content').nth(index),
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
 * Closes the connection and clears the message list of the open ws request.
 *
 * Tests in the same file share one app instance, so without this a later test inherits a live
 * socket and the previous test's messages — stale rows satisfy assertions on message indices
 * before the new connection is even open, and the still-open socket hides the connect button.
 * Disconnect first, then clear, so the "Closed" entry is cleared too.
 */
export const resetWsResponse = async (page: Page) => {
  await test.step('Disconnect and clear the ws response', async () => {
    const locators = buildWebsocketCommonLocators(page);
    const connect = locators.connectionControls.connect();
    const disconnect = locators.connectionControls.disconnect();
    const clearResponse = locators.toolbar.clearResponse();

    // Exactly one of the two buttons is rendered at a time, but neither is while the connection is
    // still opening or closing. Settle on one before the snapshot below, or a mid-transition pane
    // reads as "not connected" and the disconnect is skipped — the no-op this helper exists to avoid.
    await expect(connect.or(disconnect)).toBeVisible();

    if (await disconnect.isVisible()) {
      await disconnect.click();
      await connect.waitFor();
    }

    if (await clearResponse.isVisible()) {
      await clearResponse.click();
      // Count rather than waiting for the first row to detach, which is already true of an empty list.
      await expect(locators.messages()).toHaveCount(0);
    }
  });
};
