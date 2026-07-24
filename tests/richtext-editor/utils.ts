import { expect } from '../../playwright';
import { createCollection } from '../utils/page/actions';
import { buildCommonLocators } from '../utils/page/locators';

export const setupRequestDocs = async (page: any, createTmpDir: any, collectionName: string) => {
  page.on('console', (msg: any) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err: any) => console.log('PAGE ERROR:', err.message));
  const tmpDir = await createTmpDir(collectionName);
  const locators = buildCommonLocators(page);
  await createCollection(page, collectionName, tmpDir);
  await locators.sidebar.collection(collectionName).hover();
  await locators.actions.collectionActions(collectionName).click();
  await locators.dropdown.item('New Request').click();
  await page.getByTestId('request-name').fill('test-req');
  await locators.modal.button('Create').click();
  await locators.modal.backdrop().waitFor({ state: 'hidden' });
  await expect(locators.tabs.requestTab('test-req')).toBeVisible();

  await page.waitForSelector('.request-pane');

  const docsTab = locators.docs.docsTab();
  const moreTabs = locators.docs.moreTabs();
  await expect(docsTab.or(moreTabs)).toBeVisible();

  if (await docsTab.isVisible()) {
    await docsTab.click();
  } else {
    await moreTabs.click();
    await locators.dropdown.item('Docs').click();
  }
  console.log('Waiting for edit btn...');
  const editBtn = locators.docs.editToggle();
  await editBtn.waitFor({ state: 'visible', timeout: 5000 });
  const text = await editBtn.textContent();
  console.log('Found edit btn text:', text);
  if (text?.includes('Edit')) {
    await editBtn.click();
  }

  return locators;
};
