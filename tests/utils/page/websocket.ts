import { Page } from '../../../playwright';

export const buildWebsocketCommonLocators = (page: Page) => ({
  connectionControls: {
    connect: () => page.getByTestId('ws-connect-button'),
    disconnect: () => page.getByTestId('ws-disconnect-button')
  },
  messages: () => page.locator('.ws-message'),
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
