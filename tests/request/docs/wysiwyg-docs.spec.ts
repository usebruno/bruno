import { test, expect } from '../../../playwright';
import { createCollection, closeAllCollections } from '../../utils/page/actions';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Wysiwyg Docs Editor Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  const setupRequestDocs = async (page: any, createTmpDir: any, collectionName: string) => {
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
    const tmpDir = await createTmpDir(collectionName);
    const locators = buildCommonLocators(page);
    await createCollection(page, collectionName, tmpDir);
    await locators.sidebar.collection(collectionName).hover();
    await locators.actions.collectionActions(collectionName).click();
    await locators.dropdown.item('New Request').click();
    await page.getByTestId('request-name').fill('test-req');
    await locators.modal.button('Create').click();

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

  test('Line-Level Formatting', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-wysiwyg-line-formatting');

    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();
    await page.keyboard.type('Line 1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Line 2');

    await page.keyboard.press('ArrowUp');

    await locators.docs.headingDropdown().click();
    await locators.dropdown.item('Heading 1').click();

    await expect(prosemirror.locator('h1')).toHaveCount(1);
    await expect(prosemirror.locator('h1')).toContainText('Line 1');
    await expect(prosemirror.locator('p')).toContainText('Line 2');
  });

  test('Toolbar Tooltips visibility', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-wysiwyg-tooltips');

    const boldButton = locators.docs.toolbarBtn('Bold');
    await expect(boldButton).toBeVisible();

    await boldButton.hover();

    await expect(locators.docs.tooltip('Bold')).toBeVisible();
  });

  test('Text Formatting and Undo/Redo', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-wysiwyg-formatting');

    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();
    await page.keyboard.type('Hello World');

    await page.keyboard.down('Shift');
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowLeft');
    }
    await page.keyboard.up('Shift');

    await locators.docs.toolbarBtn('Bold').click();
    await expect(prosemirror.locator('strong')).toHaveText('World');

    await locators.docs.toolbarBtn('Italic').click();
    await expect(prosemirror.locator('strong em, em strong').first()).toHaveText('World');

    await locators.docs.toolbarBtn('Undo').click();
    await expect(prosemirror.locator('em')).toHaveCount(0);
    await expect(prosemirror.locator('strong')).toHaveText('World');

    await locators.docs.toolbarBtn('Redo').click();
    await expect(prosemirror.locator('strong em, em strong').first()).toHaveText('World');

    await locators.docs.toolbarBtn('Strikethrough').click();
    await expect(prosemirror.locator('s')).toHaveText('World');

    await locators.docs.toolbarBtn('Inline code').click();
    await expect(prosemirror.locator('code')).toHaveText('World');
  });

  test('Lists and Code Blocks', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-wysiwyg-lists-code');

    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();
    await page.keyboard.type('Item 1');

    await locators.docs.toolbarBtn('Bullet list').click();
    await expect(prosemirror.locator('ul > li')).toContainText('Item 1');

    await page.keyboard.press('Enter');
    await page.keyboard.type('Item 2');

    await locators.docs.toolbarBtn('Numbered list').click();
    await expect(prosemirror.locator('ol > li').nth(1)).toContainText('Item 2');

    await locators.docs.toolbarBtn('Numbered list').click();
    await expect(prosemirror.locator('p').filter({ hasText: 'Item 2' })).toBeVisible();

    await locators.docs.toolbarBtn('Task list').click();
    await expect(prosemirror.locator('ul[data-type="taskList"] > li')).toBeVisible();

    const checkbox = prosemirror.locator('ul[data-type="taskList"] > li label input[type="checkbox"]').first();
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    await locators.docs.toolbarBtn('Code block').click();
    await page.keyboard.type('const x = 1;');
    await expect(prosemirror.locator('pre code')).toContainText('const x = 1;');
  });

  test('Table Insertion', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-wysiwyg-table');

    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();

    await locators.docs.toolbarBtn('Table').click();

    await expect(prosemirror.locator('table')).toBeVisible();
    await expect(prosemirror.locator('tr')).toHaveCount(3);
  });

  test('Markdown to WYSIWYG Sync', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-markdown-sync');

    // Switch to Markdown
    await locators.docs.modeSwitchMarkdown().click();
    await page.waitForTimeout(500);

    // Type in Markdown
    const codeEditor = locators.docs.codeEditor();
    await codeEditor.click();

    await page.keyboard.type('Hello MARKDOWN');
    await page.waitForTimeout(500);

    // Switch to WYSIWYG
    await locators.docs.modeSwitchDocs().click();
    await page.waitForTimeout(1000);

    const prosemirror = locators.docs.proseMirror();
    const wysiwygText = await prosemirror.textContent();
    expect(wysiwygText).toContain('Hello MARKDOWN');
  });

  test('Code Block Language Selection', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-wysiwyg-code-lang');

    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();
    await locators.docs.toolbarBtn('Code block').click();
    await page.keyboard.type('const x = 1;');
    await page.keyboard.press('Enter');
    await page.keyboard.type('const y = 2;');

    const langSelector = prosemirror.locator('.docs-code-block-lang-selector');
    await expect(langSelector).toBeVisible();
    await expect(langSelector).toContainText('auto');

    // Click language selector dropdown
    await langSelector.click();

    // Select javascript
    const jsOption = page.locator('.dropdown-item[data-language="javascript"]');
    await expect(jsOption).toBeVisible();
    await jsOption.click();

    // Verify language changed
    await expect(langSelector).toContainText('javascript');

    // Verify code block is properly syntax highlighted (should have hljs classes)
    const keywords = prosemirror.locator('pre code .hljs-keyword');
    await expect(keywords).toHaveCount(2);
    await expect(keywords.first()).toContainText('const');
  });
});
