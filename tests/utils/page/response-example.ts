import { expect, Locator, Page } from '../../../playwright';
import { buildCommonLocators } from './locators';
import { clickResponseAction, sendRequest } from './actions';

/**
 * Locators for the response-example
 */
export const buildResponseExampleLocators = (page: Page) => ({
  nameInput: () => page.getByTestId('create-example-name-input'),
  createButton: () => page.getByTestId('create-example-modal-submit-btn'),
  title: () => page.getByTestId('response-example-title'),
  binaryPreview: () => page.getByTestId('response-example-binary-preview'),
  binaryPreviewImage: () => page.getByTestId('response-example-binary-preview').locator('img'),
  binaryPreviewPdfCanvas: () => page.getByTestId('response-example-binary-preview').locator('.preview-pdf canvas').first(),
  binaryPreviewAudio: () => page.getByTestId('response-example-binary-preview').locator('audio'),
  binaryPreviewVideo: () => page.getByTestId('response-example-binary-preview').locator('video'),
  responseContent: () => page.getByTestId('response-example-response-content'),
  responseContentCodeMirror: () => page.getByTestId('response-example-response-content').locator('.CodeMirror').first(),
  editButton: () => page.getByTestId('response-example-edit-btn'),
  saveButton: () => page.getByTestId('response-example-save-btn'),
  responsePane: () => page.getByTestId('response-pane'),
  responsePaneTab: (key: 'response' | 'headers') => page.getByTestId('response-pane').getByTestId(`tab-${key}`),
  headerRow: (name: string) =>
    page.getByTestId('response-example-response-headers-table').locator('tbody tr').filter({
      has: page.getByTestId('column-name').getByText(new RegExp(`^${name}$`, 'i'))
    }),
  headerRowValueEditor: (row: Locator) => row.getByTestId('column-value').locator('.CodeMirror')
});

export const sendRequestAndSaveResponseExample = async (page: Page, requestName: string, exampleName: string) => {
  const { responseExample } = buildCommonLocators(page);
  await sendRequest(page);
  await clickResponseAction(page, 'response-bookmark-btn');

  await responseExample.nameInput().clear();
  await responseExample.nameInput().fill(exampleName);
  await responseExample.createButton().click();
  await expect(responseExample.title()).toHaveText(`${requestName} / ${exampleName}`);
};
