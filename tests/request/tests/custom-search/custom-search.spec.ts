import { test, expect } from '../../../../playwright';

test.describe('Custom Search Functionality in Scripts Tab', () => {
  test('should open search box when Cmd+F or Ctrl+F is pressed in scripts tab', async ({ pageWithUserData: page }) => {
    await page.getByTitle('custom-search').click();
    
    try {
      await page.getByLabel('Safe Mode').check({ timeout: 5000 });
      await page.getByRole('button', { name: 'Save' }).click();
    } catch (e) {
    }
    
    await page.getByText('search-test-request').click();

    await page.getByRole('tab', { name: 'Script' }).click();

    await expect(page.getByText('Pre Request')).toBeVisible();
    await expect(page.locator('.title.text-xs').filter({ hasText: 'Post Response' })).toBeVisible();
    
    const preRequestEditor = page.locator('text=Pre Request').locator('..').locator('.CodeMirror').first();
    const preTextarea = preRequestEditor.locator('textarea[tabindex="0"]');
    await preTextarea.focus();
    
    const preContent = await preRequestEditor.textContent();
    console.log('Pre Request content loaded:', preContent?.substring(0, 100));
    
    const postResponseEditor = page.locator('text=Post Response').locator('..').locator('.CodeMirror').first();
    const postTextarea = postResponseEditor.locator('textarea[tabindex="0"]');
    await postTextarea.focus();
    
    const postContent = await postResponseEditor.textContent();
    console.log('Post Response content loaded:', postContent?.substring(0, 100));

    await preTextarea.focus();
    await page.keyboard.press('Meta+f');

    // Verify search box appears
    await expect(page.locator('.bruno-search-bar input[placeholder="Search..."]')).toBeVisible();
    
    // Test search functionality
    const searchInput = page.locator('.bruno-search-bar input[placeholder="Search..."]');
    await searchInput.fill('searchableText');
    await expect(page.locator('.searchbar-result-count')).toContainText('1 / 4');
    
    // Test search options
    const regexButton = page.locator('.searchbar-icon-btn').filter({ hasText: '' }).first();
    const caseSensitiveButton = page.locator('.searchbar-icon-btn').filter({ hasText: '' }).nth(1);
    const wholeWordButton = page.locator('.searchbar-icon-btn').filter({ hasText: '' }).nth(2);
    
    // Test regex search
    await regexButton.click();
    await searchInput.fill('test\\w+');
    await expect(page.locator('.searchbar-result-count')).toContainText('1 / 1');
    
    // Test case sensitive search
    await regexButton.click(); 
    await caseSensitiveButton.click();
    await searchInput.fill('Test');
    await expect(page.locator('.searchbar-result-count')).toContainText('0 results');
    
    // Test whole word search
    await caseSensitiveButton.click(); 
    await wholeWordButton.click();
    await searchInput.fill('hello');
    await expect(page.locator('.searchbar-result-count')).toContainText('1 / 1');
    
    // Test close search
    const closeButton = page.locator('.searchbar-icon-btn').last();
    await closeButton.click();
    await expect(page.locator('.bruno-search-bar')).not.toBeVisible();
  });

  test('should handle search in different script editors independently', async ({ pageWithUserData: page }) => {
    await page.getByTitle('custom-search').click();
    
    await page.getByText('search-test-request').click();

    await page.getByRole('tab', { name: 'Script' }).click();

    await expect(page.getByText('Pre Request')).toBeVisible();
    await expect(page.locator('.title.text-xs').filter({ hasText: 'Post Response' })).toBeVisible();
    
    const preRequestEditor = page.locator('text=Pre Request').locator('..').locator('.CodeMirror').first();
    const postResponseEditor = page.locator('text=Post Response').locator('..').locator('.CodeMirror').first();

    const preTextarea = preRequestEditor.locator('textarea[tabindex="0"]');
    await preTextarea.focus();
    await page.keyboard.press('Meta+f');
    
    const preSearchInput = page.locator('.bruno-search-bar input[placeholder="Search..."]');
    await preSearchInput.fill('uniquePreVar');
    await expect(page.locator('.searchbar-result-count')).toContainText('1 / 1');
    await page.keyboard.press('Escape');

    const postTextarea = postResponseEditor.locator('textarea[tabindex="0"]');
    await postTextarea.focus();
    await page.keyboard.press('Meta+f');
    
    const postSearchInput = page.locator('.bruno-search-bar input[placeholder="Search..."]');
    await postSearchInput.fill('uniquePostVar');
    await expect(page.locator('.searchbar-result-count')).toContainText('1 / 1');
    await page.keyboard.press('Escape');
  });

  test('should maintain search state when switching between editors', async ({ pageWithUserData: page }) => {
    await page.getByTitle('custom-search').click();
    
    await page.getByText('search-test-request').click();

    await page.getByRole('tab', { name: 'Script' }).click();

    await expect(page.getByText('Pre Request')).toBeVisible();
    await expect(page.locator('.title.text-xs').filter({ hasText: 'Post Response' })).toBeVisible();
    
    const preRequestEditor = page.locator('text=Pre Request').locator('..').locator('.CodeMirror').first();
    const postResponseEditor = page.locator('text=Post Response').locator('..').locator('.CodeMirror').first();

    // Open search in Pre Request editor
    const preTextarea = preRequestEditor.locator('textarea[tabindex="0"]');
    await preTextarea.focus();
    await page.keyboard.press('Meta+f');
    
    const searchInput = page.locator('.bruno-search-bar input[placeholder="Search..."]');
    await searchInput.fill('commonVar');
    await expect(page.locator('.searchbar-result-count')).toContainText('1 / 1');

    // Switch to Post Response editor while search is open
    const postTextarea = postResponseEditor.locator('textarea[tabindex="0"]');
    await postTextarea.focus();
    
    // Search should still be visible and functional
    await expect(page.locator('.bruno-search-bar')).toBeVisible();
    await expect(searchInput).toHaveValue('commonVar');
    
    const closeButton = page.locator('.searchbar-icon-btn').last();
    await closeButton.click();
    await expect(page.locator('.bruno-search-bar')).not.toBeVisible();
  });
});
