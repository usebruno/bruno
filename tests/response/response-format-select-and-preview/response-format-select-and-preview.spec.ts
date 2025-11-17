import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';

test.describe.serial('Response Format Select and Preview', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Verify Response Format Select and Preview features are rendering properly for JSON response', async ({ pageWithUserData: page }) => {
    await test.step('Navigate to collection and request', async () => {
      // Navigate to the test collection
      await expect(page.locator('#sidebar-collection-name').getByText('collection')).toBeVisible();
      await page.locator('#sidebar-collection-name').getByText('collection').click();

      // Navigate to the request
      await page.getByRole('complementary').getByText('request-json').click();
    });

    await test.step('Send the request and wait for response', async () => {
      await page.getByTestId('send-arrow-icon').click();
      await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });
    });

    let responseBody, editorContainer, responseFormatTab, codeLine, previewTab, previewContainer;

    await test.step('Verify response pane and default JSON editor formatting', async () => {
      responseBody = page.locator('.response-pane');
      await expect(responseBody).toBeVisible();

      editorContainer = await responseBody.locator('.editor-container');
      responseFormatTab = page.getByTestId('format-response-tab');
      await expect(responseFormatTab).toHaveText('JSON');

      codeLine = editorContainer.locator('.CodeMirror-line');
      await expect(codeLine.nth(1)).toContainText('"hello": "bruno"');
    });

    await test.step('Switch to Preview tab and check formatted object', async () => {
      previewTab = page.getByTestId('preview-response-tab');
      await expect(previewTab).toBeVisible();

      await previewTab.click();

      const objectContents = await responseBody.locator('.object-content');
      await expect(objectContents.nth(1)).toContainText('"hello":"bruno"');
    });

    await test.step('Switch to Editor, select HTML, verify editor and preview', async () => {
      await responseFormatTab.click();
      await responseFormatTab.click();
      await page.getByTestId('format-response-tab-dropdown').getByText('HTML').click();
      await expect(codeLine.nth(1)).toContainText('"hello": "bruno"');

      await previewTab.click();
      previewContainer = page.getByTestId('response-preview-container');
      await expect(previewContainer).toContainText('{"hello":"bruno"}');
    });

    await test.step('Switch to Editor, select XML, verify editor and preview error', async () => {
      await responseFormatTab.click();
      await responseFormatTab.click();
      await page.getByTestId('format-response-tab-dropdown').getByText('XML').click();
      await expect(codeLine.nth(1)).toContainText('"hello": "bruno"');

      await previewTab.click();
      await expect(previewContainer).toContainText('"ERROR"');
    });

    await test.step('Switch to Editor, select JavaScript, verify editor and preview fallback', async () => {
      await responseFormatTab.click();
      await responseFormatTab.click();
      await page.getByTestId('format-response-tab-dropdown').getByText('JavaScript').click();
      await expect(codeLine.nth(1)).toContainText('"hello": "bruno"');

      await previewTab.click();
      await expect(previewContainer).toContainText('{"hello":"bruno"}');
    });

    await test.step('Switch to Editor, select Raw, verify editor and preview', async () => {
      await responseFormatTab.click();
      await responseFormatTab.click();
      await page.getByTestId('format-response-tab-dropdown').getByText('Raw').click();
      await expect(codeLine.nth(1)).toContainText('"hello": "bruno"');

      await previewTab.click();
      await expect(previewContainer).toContainText('{"hello":"bruno"}');
    });

    await test.step('Switch to Editor, select Hex, verify editor and preview', async () => {
      await responseFormatTab.click();
      await responseFormatTab.click();
      await page.getByTestId('format-response-tab-dropdown').getByText('Hex').click();
      await expect(editorContainer).toContainText('00000000: 7B 0A 20 20 22 68 65 6C 6C 6F 22 3A 20 22');

      await previewTab.click();
      await expect(previewContainer).toContainText('{"hello":"bruno"}');
    });

    await test.step('Switch to Editor, select Base64, verify editor and preview', async () => {
      await responseFormatTab.click();
      await responseFormatTab.click();
      await page.getByTestId('format-response-tab-dropdown').getByText('Base64').click();
      await expect(editorContainer).toContainText('ewogICJoZWxsbyI6ICJicnVubyIKfQ==');

      await previewTab.click();
      await expect(previewContainer).toContainText('{"hello":"bruno"}');
    });
  });

  test('Verify Response Format Select and Preview features are rendering properly for HTML response', async ({ pageWithUserData: page }) => {
    await test.step('Navigate to collection and request', async () => {
      // Navigate to the test collection
      await expect(page.locator('#sidebar-collection-name').getByText('collection')).toBeVisible();
      await page.locator('#sidebar-collection-name').getByText('collection').click();

      // Navigate to the request
      await page.getByRole('complementary').getByText('request-html').click();
    });

    await test.step('Send the request and wait for response', async () => {
      await page.getByTestId('send-arrow-icon').click();
      await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });
    });

    let responseBody, editorContainer, responseFormatTab, codeLine, previewTab, previewContainer;

    await test.step('Verify response pane and default HTML preview', async () => {
      responseBody = page.locator('.response-pane');
      await expect(responseBody).toBeVisible();

      editorContainer = await responseBody.locator('.editor-container');

      previewTab = page.getByTestId('preview-response-tab');
      await expect(previewTab).toBeVisible();

      previewContainer = page.getByTestId('response-preview-container');
      await expect(previewContainer.locator('webview')).toBeVisible();
    });

    await test.step('Switch to Editor tab and check formatted HTML', async () => {
      responseFormatTab = page.getByTestId('format-response-tab');
      await expect(responseFormatTab).toHaveText('HTML');

      await responseFormatTab.click();

      codeLine = editorContainer.locator('.CodeMirror-line');
      await expect(codeLine.first()).toContainText('<h1>hello</h1>');
    });

    await test.step('Select JSON, verify editor and preview', async () => {
      await responseFormatTab.click();
      await page.getByTestId('format-response-tab-dropdown').getByText('JSON').click();
      await expect(codeLine.first()).toContainText('<h1>hello</h1>');

      await previewTab.click();
      await expect(previewContainer).toContainText('"ERROR"');
    });

    await test.step('Switch to Editor, select XML, verify editor and preview', async () => {
      await responseFormatTab.click();
      await responseFormatTab.click();
      await page.getByTestId('format-response-tab-dropdown').getByText('XML').click();
      await expect(codeLine.first()).toContainText('<h1>hello</h1>');

      await previewTab.click();
      await expect(previewContainer).toContainText('h1');
      await expect(previewContainer).toContainText(':');
      await expect(previewContainer).toContainText('hello');
    });

    await test.step('Switch to Editor, select JavaScript, verify editor and preview fallback', async () => {
      await responseFormatTab.click();
      await responseFormatTab.click();
      await page.getByTestId('format-response-tab-dropdown').getByText('JavaScript').click();
      await expect(codeLine.first()).toContainText('<h1>hello</h1>');

      await previewTab.click();
      await expect(previewContainer.locator('webview')).toBeVisible();
    });

    await test.step('Switch to Editor, select Raw, verify editor and preview', async () => {
      await responseFormatTab.click();
      await responseFormatTab.click();
      await page.getByTestId('format-response-tab-dropdown').getByText('Raw').click();
      await expect(codeLine.first()).toContainText('<h1>hello</h1>');

      await previewTab.click();
      await expect(previewContainer).toContainText('<h1>hello</h1>');
    });

    await test.step('Switch to Editor, select Hex, verify editor and preview', async () => {
      await responseFormatTab.click();
      await responseFormatTab.click();
      await page.getByTestId('format-response-tab-dropdown').getByText('Hex').click();
      await expect(editorContainer).toContainText('00000000: 3C 68 31 3E 68 65 6C 6C 6F 3C 2F 68 31 3E');

      await previewTab.click();
      await expect(previewContainer).toContainText('<h1>hello</h1>');
    });

    await test.step('Switch to Editor, select Base64, verify editor and preview', async () => {
      await responseFormatTab.click();
      await responseFormatTab.click();
      await page.getByTestId('format-response-tab-dropdown').getByText('Base64').click();
      await expect(editorContainer).toContainText('PGgxPmhlbGxvPC9oMT4=');

      await previewTab.click();
      await expect(previewContainer).toContainText('<h1>hello</h1>');
    });
  });
});
