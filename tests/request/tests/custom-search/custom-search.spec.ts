import { test, expect } from '../../../../playwright';

test.describe('Custom Search Functionality in Scripts Tab', () => {
  test('should open search box when Cmd+F or Ctrl+F is pressed in scripts tab', async ({ pageWithUserData: page }) => {
    await page.getByTitle('custom-search').click();

    await page.getByText('search-test-request').click();

    await page.getByRole('tab', { name: 'Script' }).click();

    // Pre Request tab should be active by default
    await expect(page.getByRole('button', { name: 'Pre Request' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Post Response' })).toBeVisible();

    // Click on Pre Request tab to ensure it's active
    await page.getByRole('button', { name: 'Pre Request' }).click();

    const preRequestEditor = page.getByTestId('pre-request-script-editor').locator('.CodeMirror').first();
    const preTextarea = preRequestEditor.locator('textarea[tabindex="0"]');
    await preTextarea.focus();

    const preContent = await preRequestEditor.textContent();
    console.log('Pre Request content loaded:', preContent?.substring(0, 100));

    await page.keyboard.press('Meta+f');

    // Verify search box appears
    const preEditorSearchBar = page.getByTestId('pre-request-script-editor');
    await expect(preEditorSearchBar.locator('.bruno-search-bar input[placeholder="Search..."]')).toBeVisible();

    // Test search functionality
    const searchInput = preEditorSearchBar.locator('.bruno-search-bar input[placeholder="Search..."]');
    await searchInput.fill('searchableText');
    await expect(preEditorSearchBar.locator('.searchbar-result-count')).toContainText('1 / 4');

    // Test search options
    const regexButton = preEditorSearchBar.locator('.searchbar-icon-btn').filter({ hasText: '' }).first();
    const caseSensitiveButton = preEditorSearchBar.locator('.searchbar-icon-btn').filter({ hasText: '' }).nth(1);
    const wholeWordButton = preEditorSearchBar.locator('.searchbar-icon-btn').filter({ hasText: '' }).nth(2);

    // Test regex search
    await regexButton.click();
    await searchInput.fill('test\\w+');
    await expect(preEditorSearchBar.locator('.searchbar-result-count')).toContainText('1 / 1');

    // Test case sensitive search
    await regexButton.click();
    await caseSensitiveButton.click();
    await searchInput.fill('Test');
    await expect(preEditorSearchBar.locator('.searchbar-result-count')).toContainText('0 results');

    // Test whole word search
    await caseSensitiveButton.click();
    await wholeWordButton.click();
    await searchInput.fill('hello');
    await expect(preEditorSearchBar.locator('.searchbar-result-count')).toContainText('1 / 1');

    // Test close search
    const closeButton = page.getByTestId('pre-request-script-editor').locator('.searchbar-icon-btn').last();
    await closeButton.click();
    await expect(page.getByTestId('pre-request-script-editor').locator('.bruno-search-bar')).not.toBeVisible();
  });

  test('should handle search in different script editors independently', async ({ pageWithUserData: page }) => {
    await page.getByTitle('custom-search').click();

    await page.getByText('search-test-request').click();

    await page.getByRole('tab', { name: 'Script' }).click();

    // Test Pre Request tab
    await page.getByRole('button', { name: 'Pre Request' }).click();

    const preRequestEditor = page.getByTestId('pre-request-script-editor').locator('.CodeMirror').first();
    const preTextarea = preRequestEditor.locator('textarea[tabindex="0"]');
    await preTextarea.focus();
    await page.keyboard.press('Meta+f');

    const preSearchInput = page.getByTestId('pre-request-script-editor').locator('.bruno-search-bar input[placeholder="Search..."]');
    await preSearchInput.fill('uniquePreVar');
    await expect(page.getByTestId('pre-request-script-editor').locator('.searchbar-result-count')).toContainText('1 / 1');
    await page.keyboard.press('Escape');

    // Switch to Post Response tab
    await page.getByRole('button', { name: 'Post Response' }).click();

    const postResponseEditor = page.getByTestId('post-response-script-editor').locator('.CodeMirror').first();
    const postTextarea = postResponseEditor.locator('textarea[tabindex="0"]');
    await postTextarea.focus();
    await page.keyboard.press('Meta+f');

    const postSearchInput = page.getByTestId('post-response-script-editor').locator('.bruno-search-bar input[placeholder="Search..."]');
    await postSearchInput.fill('uniquePostVar');
    await expect(page.getByTestId('post-response-script-editor').locator('.searchbar-result-count')).toContainText('1 / 1');
    await page.keyboard.press('Escape');
  });

  test('should maintain search state when switching between tabs', async ({ pageWithUserData: page }) => {
    await page.getByTitle('custom-search').click();

    await page.getByText('search-test-request').click();

    await page.getByRole('tab', { name: 'Script' }).click();

    // Open search in Pre Request editor
    await page.getByRole('button', { name: 'Pre Request' }).click();

    const preRequestEditor = page.getByTestId('pre-request-script-editor').locator('.CodeMirror').first();
    const preTextarea = preRequestEditor.locator('textarea[tabindex="0"]');
    await preTextarea.focus();
    await page.keyboard.press('Meta+f');

    const preSearchInput = page.getByTestId('pre-request-script-editor').locator('.bruno-search-bar input[placeholder="Search..."]');
    await preSearchInput.fill('commonVar');
    await expect(page.getByTestId('pre-request-script-editor').locator('.searchbar-result-count')).toContainText('1 / 1');

    // Switch to Post Response tab while search is open
    await page.getByRole('button', { name: 'Post Response' }).click();

    // Open search in Post Response editor
    const postResponseEditor = page.getByTestId('post-response-script-editor').locator('.CodeMirror').first();
    const postTextarea = postResponseEditor.locator('textarea[tabindex="0"]');
    await postTextarea.focus();
    await page.keyboard.press('Meta+f');

    const postSearchInput = page.getByTestId('post-response-script-editor').locator('.bruno-search-bar input[placeholder="Search..."]');
    await postSearchInput.fill('postVar');
    await expect(page.getByTestId('post-response-script-editor').locator('.searchbar-result-count')).toContainText('1 / 1');

    // Switch back to Pre Request tab
    await page.getByRole('button', { name: 'Pre Request' }).click();

    // Search state should be maintained in Pre Request editor
    await expect(page.getByTestId('pre-request-script-editor').locator('.bruno-search-bar')).toBeVisible();
    await expect(preSearchInput).toHaveValue('commonVar');

    // Close the search in Pre Request editor
    const closeButton = page.getByTestId('pre-request-script-editor').locator('.searchbar-icon-btn').last();
    await closeButton.click();
    await expect(page.getByTestId('pre-request-script-editor').locator('.bruno-search-bar')).not.toBeVisible();
  });
});
