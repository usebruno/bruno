import { test, expect } from '../../../playwright';
import { openCollection } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Code Generation URL Encoding', () => {
  test.describe('when encodeUrl is true', () => {
    test('should encode unencoded URL (spaces to %20)', async ({ pageWithUserData: page }) => {
      const { sidebar, request, modal } = buildCommonLocators(page);

      await openCollection(page, 'encoding-test');
      await sidebar.request('encode-url-unencoded').click();

      await request.generateCodeButton().click();
      await expect(page.getByRole('dialog')).toBeVisible();

      const codeEditor = page.locator('.editor-content .CodeMirror').first();
      await expect(codeEditor).toBeVisible();

      const generatedCode = await codeEditor.textContent();
      expect(generatedCode).toContain('http://base.source?name=John%20Doe');

      await modal.closeButton().click();
      await modal.closeButton().waitFor({ state: 'hidden' });
    });

    test('should double-encode pre-encoded URL (%20 to %2520)', async ({ pageWithUserData: page }) => {
      const { sidebar, request, modal } = buildCommonLocators(page);

      await openCollection(page, 'encoding-test');
      await sidebar.request('encode-url-preencoded').click();

      await request.generateCodeButton().click();
      await expect(page.getByRole('dialog')).toBeVisible();

      const codeEditor = page.locator('.editor-content .CodeMirror').first();
      await expect(codeEditor).toBeVisible();

      const generatedCode = await codeEditor.textContent();
      expect(generatedCode).toContain('http://base.source?name=John%2520Doe');

      await modal.closeButton().click();
      await modal.closeButton().waitFor({ state: 'hidden' });
    });
  });

  test.describe('when encodeUrl is false', () => {
    test('should preserve unencoded URL as-is (spaces kept)', async ({ pageWithUserData: page }) => {
      const { sidebar, request, modal } = buildCommonLocators(page);

      await openCollection(page, 'encoding-test');
      await sidebar.request('raw-url-unencoded').click();

      await request.generateCodeButton().click();
      await expect(page.getByRole('dialog')).toBeVisible();

      const codeEditor = page.locator('.editor-content .CodeMirror').first();
      await expect(codeEditor).toBeVisible();

      const generatedCode = await codeEditor.textContent();
      expect(generatedCode).toContain('http://base.source?name=John Doe');

      await modal.closeButton().click();
      await modal.closeButton().waitFor({ state: 'hidden' });
    });

    test('should preserve pre-encoded URL as-is', async ({ pageWithUserData: page }) => {
      const { sidebar, request, modal } = buildCommonLocators(page);

      await openCollection(page, 'encoding-test');
      await sidebar.request('raw-url-preencoded').click();

      await request.generateCodeButton().click();
      await expect(page.getByRole('dialog')).toBeVisible();

      const codeEditor = page.locator('.editor-content .CodeMirror').first();
      await expect(codeEditor).toBeVisible();

      const generatedCode = await codeEditor.textContent();
      expect(generatedCode).toContain('http://base.source?name=John%20Doe');

      await modal.closeButton().click();
      await modal.closeButton().waitFor({ state: 'hidden' });
    });
  });
});
