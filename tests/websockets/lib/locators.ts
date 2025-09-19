import { Page } from '../../../playwright';

export const buildCommonLocators = (page: Page) => ({
  runner: () => page.getByTestId('run-button'),
  connectionControls: {
    connect: () =>
      page
        .locator('div.connection-controls')
        .locator('.infotip')
        .filter({ hasText: /^Connect$/ }),
    disconnect: () =>
      page
        .locator('div.connection-controls')
        .locator('.infotip')
        .filter({ hasText: /^Close Connection$/ })
  },
  messages: () => page.locator('.ws-message').all(),
  toolbar: {
    latestFirst:() => page.getByRole('button', { name: 'Latest First' }),
    latestLast:() => page.getByRole('button', { name: 'Latest Last' }),
    clearResponse: () => page.getByRole('button', { name: 'Clear Response' })
  }
});