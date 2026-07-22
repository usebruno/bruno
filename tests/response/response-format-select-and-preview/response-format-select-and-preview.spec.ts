import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import {
  openRequest,
  sendRequestAndWaitForResponse,
  switchResponseFormat,
  switchToPreviewTab,
  switchToEditorTab
} from '../../utils/page/actions';

test.describe.serial('Response Format Select and Preview', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Verify Response Format Select and Preview features are rendering properly for JSON response', async ({ pageWithUserData: page }) => {
    await openRequest(page, 'collection', 'request-json');
    await sendRequestAndWaitForResponse(page);

    const locators = buildCommonLocators(page);
    const responseBody = locators.response.body();
    const editorContainer = locators.response.editorContainer();
    const responseFormatTab = locators.response.formatTab();
    const codeLine = locators.response.codeLine();
    const previewContainer = locators.response.previewContainer();

    await test.step('Verify response pane and default JSON editor formatting', async () => {
      await expect(responseBody).toBeVisible();
      await expect(responseFormatTab).toHaveText('JSON');
      await expect(codeLine.nth(1)).toContainText('"hello": "bruno"');
    });

    await test.step('Switch to Preview tab and check formatted object', async () => {
      await switchToPreviewTab(page);
      const jsonTreeLines = locators.response.jsonTreeLine();
      await expect(jsonTreeLines.nth(1)).toContainText('"hello":"bruno"');
    });

    await test.step('Switch to Editor, select HTML, verify editor and preview', async () => {
      await switchToEditorTab(page);
      await switchResponseFormat(page, 'HTML');
      await expect(codeLine.nth(1)).toContainText('"hello": "bruno"');
      await switchToPreviewTab(page);
      await expect(previewContainer.locator('webview')).toBeVisible();
    });

    await test.step('Switch to Editor, select XML, verify editor and preview error', async () => {
      await switchToEditorTab(page);
      await switchResponseFormat(page, 'XML');
      await expect(codeLine.nth(1)).toContainText('"hello": "bruno"');
      await switchToPreviewTab(page);
      await expect(previewContainer).toContainText('Cannot preview as XML');
    });

    await test.step('Switch to Editor, select JavaScript, verify editor and preview fallback', async () => {
      await switchToEditorTab(page);
      await switchResponseFormat(page, 'JavaScript');
      await expect(codeLine.nth(1)).toContainText('"hello": "bruno"');
      await switchToPreviewTab(page);
      await expect(previewContainer.locator('webview')).toBeVisible();
    });

    await test.step('Switch to Editor, select Raw, verify editor and preview', async () => {
      await switchToEditorTab(page);
      await switchResponseFormat(page, 'Raw');
      await expect(codeLine.nth(1)).toContainText('"hello": "bruno"');
      await switchToPreviewTab(page);
      await expect(previewContainer).toContainText('{"hello":"bruno"}');
    });

    await test.step('Switch to Editor, select Hex, verify editor and preview', async () => {
      await switchToEditorTab(page);
      await switchResponseFormat(page, 'Hex');
      await expect(editorContainer).toContainText('00000000: 7B 0A 20 20 22 68 65 6C 6C 6F 22 3A 20 22');
      await switchToPreviewTab(page);
      await expect(previewContainer).toContainText('{"hello":"bruno"}');
    });

    await test.step('Switch to Editor, select Base64, verify editor and preview', async () => {
      await switchToEditorTab(page);
      await switchResponseFormat(page, 'Base64');
      await expect(editorContainer).toContainText('ewogICJoZWxsbyI6ICJicnVubyIKfQ==');
      await switchToPreviewTab(page);
      await expect(previewContainer).toContainText('{"hello":"bruno"}');
    });
  });

  test('Verify Response Format Select and Preview features are rendering properly for HTML response', async ({ pageWithUserData: page }) => {
    await openRequest(page, 'collection', 'request-html');
    await sendRequestAndWaitForResponse(page);

    const locators = buildCommonLocators(page);
    const responseBody = locators.response.body();
    const editorContainer = locators.response.editorContainer();
    const responseFormatTab = locators.response.formatTab();
    const codeLine = locators.response.codeLine();
    const previewContainer = locators.response.previewContainer();

    await test.step('Verify response pane and default HTML preview', async () => {
      await expect(responseBody).toBeVisible();
      await expect(previewContainer.locator('webview')).toBeVisible();
    });

    await test.step('Switch to Editor tab and check formatted HTML', async () => {
      await expect(responseFormatTab).toHaveText('HTML');
      await switchToEditorTab(page);
      await expect(codeLine.first()).toContainText('<h1>hello</h1>');
    });

    await test.step('Select JSON, verify editor and preview', async () => {
      await switchResponseFormat(page, 'JSON');
      await expect(codeLine.first()).toContainText('<h1>hello</h1>');
      await switchToPreviewTab(page);
      await expect(previewContainer).toContainText('Cannot preview as JSON');
    });

    await test.step('Switch to Editor, select XML, verify editor and preview', async () => {
      await switchToEditorTab(page);
      await switchResponseFormat(page, 'XML');
      await expect(codeLine.first()).toContainText('<h1>hello</h1>');
      await switchToPreviewTab(page);
      await expect(previewContainer).toContainText('h1');
      await expect(previewContainer).toContainText(':');
      await expect(previewContainer).toContainText('hello');
    });

    await test.step('Switch to Editor, select JavaScript, verify editor and preview fallback', async () => {
      await switchToEditorTab(page);
      await switchResponseFormat(page, 'JavaScript');
      await expect(codeLine.first()).toContainText('<h1>hello</h1>');
      await switchToPreviewTab(page);
      await expect(previewContainer.locator('webview')).toBeVisible();
    });

    await test.step('Switch to Editor, select Raw, verify editor and preview', async () => {
      await switchToEditorTab(page);
      await switchResponseFormat(page, 'Raw');
      await expect(codeLine.first()).toContainText('<h1>hello</h1>');
      await switchToPreviewTab(page);
      await expect(previewContainer).toContainText('<h1>hello</h1>');
    });

    await test.step('Switch to Editor, select Hex, verify editor and preview', async () => {
      await switchToEditorTab(page);
      await switchResponseFormat(page, 'Hex');
      await expect(editorContainer).toContainText('00000000: 3C 68 31 3E 68 65 6C 6C 6F 3C 2F 68 31 3E');
      await switchToPreviewTab(page);
      await expect(previewContainer).toContainText('<h1>hello</h1>');
    });

    await test.step('Switch to Editor, select Base64, verify editor and preview', async () => {
      await switchToEditorTab(page);
      await switchResponseFormat(page, 'Base64');
      await expect(editorContainer).toContainText('PGgxPmhlbGxvPC9oMT4=');
      await switchToPreviewTab(page);
      await expect(previewContainer).toContainText('<h1>hello</h1>');
    });
  });
});
