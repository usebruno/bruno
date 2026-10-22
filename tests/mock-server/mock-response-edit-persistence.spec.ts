import { test, expect } from '../../playwright';
import { switchToOpenTab } from '../utils/page/actions';
import {
  buildMockServerLocators,
  openMockServerTab,
  syncResponsesFromExamples,
  createMockServerFromCollection
} from '../utils/page/mock-server';

const COLLECTION_NAME = 'mock-server-test-collection';

test.describe.serial('Mock response edit persistence', () => {
  test('should create a mock server with responses synced from examples', async ({ pageWithUserData: page }) => {
    await createMockServerFromCollection(page, COLLECTION_NAME, 'Edit Persistence Mock Server');
    await syncResponsesFromExamples(page, COLLECTION_NAME);
  });

  test('should keep edit mode and unsaved edits after switching tabs', async ({ pageWithUserData: page }) => {
    const ms = buildMockServerLocators(page);
    let savedName = '';
    const editedName = 'edited-mock-response-name';

    await test.step('Open a mock response and start editing', async () => {
      await openMockServerTab(page, COLLECTION_NAME);
      await ms.tabResponses().click();
      await ms.responseOpenBtn('created-201').click();
      await expect(ms.responseTitle()).toBeVisible();
      savedName = (await ms.responseTitle().innerText()).trim();

      await ms.responseEditBtn().click();
      await ms.responseNameInput().fill(editedName);
      await expect(ms.responseCancelBtn()).toBeVisible();
    });

    await test.step('Switch to the mock server tab and back', async () => {
      await openMockServerTab(page, COLLECTION_NAME);
      await expect(ms.responseNameInput()).not.toBeVisible();
      await switchToOpenTab(page, savedName);
    });

    await test.step('Edit mode and the unsaved name are preserved', async () => {
      await expect(ms.responseCancelBtn()).toBeVisible();
      await expect(ms.responseSaveBtn()).toBeVisible();
      await expect(ms.responseEditBtn()).not.toBeVisible();
      await expect(ms.responseNameInput()).toHaveValue(editedName);
    });

    await test.step('Cancel discards the edit and restores the saved name', async () => {
      await ms.responseCancelBtn().click();
      await expect(ms.responseEditBtn()).toBeVisible();
      await expect(ms.responseTitle()).toHaveText(savedName);
    });
  });
});
