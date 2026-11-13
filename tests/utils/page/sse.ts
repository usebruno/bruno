import { Page } from '../../../playwright';
import { buildRequestLocators } from '../request';

export const buildSseLocators = (page: Page) => ({
  variable: (name: string) => page.getByTestId(`sse-variable-${name}`),
  mode: () => page.getByLabel('SSE extraction mode'),
  view: (name: string) => page.getByRole('tab', { name, exact: true }),
  name: (index: number) => page.getByLabel(`Variable name ${index}`),
  path: (index: number) => page.getByLabel(`JSONPath ${index}`, { exact: true }),
  saveVariables: () => page.getByLabel('Save as runtime variables when the stream ends'),
  status: () => page.getByTestId('response-status-code'),
  headersTab: () => page.getByTestId('response-pane').getByTestId('responsive-tab-headers'),
  rawMessage: () => page.getByTestId('ws-message-content')
});

export const setSseRequestUrl = async (page: Page, url: string) => {
  await buildRequestLocators(page).urlInput().click();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.keyboard.insertText(url);
};
