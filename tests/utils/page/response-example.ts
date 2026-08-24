import { expect, Page } from '../../../playwright';
import { buildCommonLocators } from './locators';
import { clickResponseAction, expandCollection, expandFolder, sendRequest } from './actions';

/**
 * Locators for the response-example view — the Create Example modal input,
 * the example tab's title bar, and its response pane content.
 */
export const buildResponseExampleLocators = (page: Page) => ({
  nameInput: () => page.getByTestId('create-example-name-input'),
  createButton: () => page.getByTestId('create-example-modal-submit-btn'),
  title: () => page.getByTestId('response-example-title'),
  binaryPreview: () => page.getByTestId('response-example-binary-preview'),
  responseContent: () => page.getByTestId('response-example-response-content')
});

export const openCollectionRequest = async (page: Page, collectionName: string, folderName: string | undefined, requestName: string) => {
  const locators = buildCommonLocators(page);
  await expandCollection(page, collectionName);
  if (folderName) {
    await expandFolder(page, folderName);
    await locators.sidebar.folderRequest(folderName, requestName).click();
  } else {
    await locators.sidebar.request(requestName).click();
  }
};

export const sendReqAndSaveResposeExample = async (page: Page, requestName: string, exampleName: string) => {
  const { responseExample } = buildCommonLocators(page);
  await sendRequest(page);
  await clickResponseAction(page, 'response-bookmark-btn');

  await responseExample.nameInput().clear();
  await responseExample.nameInput().fill(exampleName);
  await responseExample.createButton().click();
  await expect(responseExample.title()).toHaveText(`${requestName} / ${exampleName}`);
};
