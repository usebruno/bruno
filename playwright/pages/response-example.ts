import { expect, Locator, Page } from '..';
import { sendRequest } from './request/send';
import { clickResponseAction } from './response';

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
  tryButton: () => page.getByTestId('response-example-try-btn'),
  saveButton: () => page.getByTestId('response-example-save-btn'),
  responsePane: () => page.getByTestId('response-pane'),
  responsePaneTab: (key: 'response' | 'headers') => page.getByTestId('response-pane').getByTestId(`tab-${key}`),
  headerRow: (name: string) =>
    page.getByTestId('response-example-response-headers-table').locator('tbody tr').filter({
      has: page.getByTestId('column-name').getByText(new RegExp(`^${name}$`, 'i'))
    }),
  headerRowValueEditor: (row: Locator) => row.getByTestId('column-value').locator('.CodeMirror')
});

const buildLocators = (page: Page) => ({
  responseExample: buildResponseExampleLocators(page)
});

export const sendRequestAndSaveResponseExample = async (page: Page, requestName: string, exampleName: string) => {
  const { responseExample } = buildLocators(page);
  await sendRequest(page);
  await clickResponseAction(page, 'response-bookmark-btn');

  await responseExample.nameInput().clear();
  await responseExample.nameInput().fill(exampleName);
  await responseExample.createButton().click();
  await expect(responseExample.title()).toHaveText(`${requestName} / ${exampleName}`);
};

export const createExampleFromSidebar = async (page: Page, requestName: string, exampleName: string, description: string = '') => {
  const requestRow = page.locator('.collection-item-name').filter({ hasText: requestName }).first();

  await requestRow.hover();
  await requestRow.locator('..').locator('.menu-icon').click({ force: true });
  await page.locator('.dropdown-item').filter({ hasText: 'Create Example' }).click();

  const exampleInput = page.getByTestId('create-example-name-input');
  await expect(exampleInput).toBeVisible();
  await exampleInput.clear();
  await exampleInput.fill(exampleName);
  const descriptionInput = page.getByTestId('create-example-description-input');
  await descriptionInput.clear();
  await descriptionInput.fill(description);
  await page.getByRole('button', { name: 'Create Example' }).click();
  await expect(page.locator('text=Create Response Example')).not.toBeAttached();

  // Sidebar-created examples open in edit mode (openInEditMode: true).
  await expect(page.getByTestId('response-example-name-input')).toHaveValue(exampleName);
  if (description) {
    await expect(page.getByTestId('response-example-description-input')).toHaveValue(description);
  }
};
