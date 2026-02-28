import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';
import { openRequest, sendRequestAndWaitForResponse, switchResponseFormat, switchToEditorTab, switchToPreviewTab } from '../../utils/page/actions';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe.serial('JSON Base64 preview', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('should preview base64 from JSON payload', async ({ pageWithUserData: page }) => {
    await openRequest(page, 'collection', 'request-base64-json');
    await sendRequestAndWaitForResponse(page);

    const locators = buildCommonLocators(page);
    const editorContainer = locators.response.editorContainer();
    const previewContainer = locators.response.previewContainer();
    const codeLine = locators.response.codeLine();

    await test.step('Switch to editor mode and Base64 format', async () => {
      await switchToEditorTab(page);
      await switchResponseFormat(page, 'Base64');
      await expect(editorContainer).toBeVisible();
      await expect(codeLine.first()).toContainText('eyJ');
    });

    await test.step('Switch to preview and render image from JSON base64', async () => {
      await switchToPreviewTab(page);
      await expect(previewContainer.locator('img')).toBeVisible();
    });
  });
});
