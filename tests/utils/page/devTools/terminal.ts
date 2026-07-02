import { Page } from '../../../../playwright';

export const buildTerminalLocators = (page: Page) => ({
  terminalSession: (index: number = 0) => page.getByTestId(`session-list-${index}`)
});
