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

    await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'test-req' })).toBeVisible();

    await page.waitForSelector('.request-pane');

    const docsTab = page.getByTestId('responsive-tab-docs');
    const moreTabs = page.locator('.more-tabs');
    await expect(docsTab.or(moreTabs)).toBeVisible();

    if (await docsTab.isVisible()) {
      await docsTab.click();
    } else {
      await page.locator('.more-tabs').click();
      await page.locator('.dropdown-item').filter({ hasText: 'Docs' }).click();
    }
    console.log('Waiting for edit btn...');
    const editBtn = page.locator('.docs-edit-toggle');
    await editBtn.waitFor({ state: 'visible', timeout: 5000 });
    const text = await editBtn.textContent();
    console.log('Found edit btn text:', text);
    if (text.includes('Edit')) {
      await editBtn.click();
    }

    return locators;
  };

  test('Line-Level Formatting', async ({ page, createTmpDir }) => {
    await setupRequestDocs(page, createTmpDir, 'test-wysiwyg-line-formatting');

    const prosemirror = page.locator('.ProseMirror');
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();
    await page.keyboard.type('Line 1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Line 2');

    await page.keyboard.press('ArrowUp');

    await page.locator('.heading-dropdown-trigger:not([data-toolbar-part="heading"])').click();
    await page.locator('.dropdown-item').getByText('Heading 1', { exact: true }).click();

    await expect(prosemirror.locator('h1')).toHaveCount(1);
    await expect(prosemirror.locator('h1')).toContainText('Line 1');
    await expect(prosemirror.locator('p')).toContainText('Line 2');
  });

  test('Toolbar Tooltips visibility', async ({ page, createTmpDir }) => {
    await setupRequestDocs(page, createTmpDir, 'test-wysiwyg-tooltips');

    const boldButton = page.locator('.toolbar-btn[aria-label="Bold"]');
    await expect(boldButton).toBeVisible();

    await boldButton.hover();

    await expect(page.locator('.react-tooltip').filter({ hasText: 'Bold' })).toBeVisible();
  });
  test('Text Formatting and Undo/Redo', async ({ page, createTmpDir }) => {
    await setupRequestDocs(page, createTmpDir, 'test-wysiwyg-formatting');

    const wysiwygContent = page.locator('.wysiwyg-editor-content');
    console.log('Is wysiwyg-editor-content visible?', await wysiwygContent.isVisible());
    console.log('DOM:', await page.locator('body').innerHTML());

    const prosemirror = page.locator('.ProseMirror');
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();
    await page.keyboard.type('Hello World');

    await page.keyboard.down('Shift');
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowLeft');
    }
    await page.keyboard.up('Shift');

    await page.locator('.toolbar-btn[aria-label="Bold"]').click();
    await expect(prosemirror.locator('strong')).toHaveText('World');

    await page.locator('.toolbar-btn[aria-label="Italic"]').click();
    await expect(prosemirror.locator('strong em, em strong').first()).toHaveText('World');

    await page.locator('.toolbar-btn[aria-label="Undo"]').click();
    await expect(prosemirror.locator('em')).toHaveCount(0);
    await expect(prosemirror.locator('strong')).toHaveText('World');

    await page.locator('.toolbar-btn[aria-label="Redo"]').click();
    await expect(prosemirror.locator('strong em, em strong').first()).toHaveText('World');

    await page.locator('.toolbar-btn[aria-label="Strikethrough"]').click();
    await expect(prosemirror.locator('s')).toHaveText('World');

    await page.locator('.toolbar-btn[aria-label="Inline code"]').click();
    await expect(prosemirror.locator('code')).toHaveText('World');
  });

  test('Lists and Code Blocks', async ({ page, createTmpDir }) => {
    await setupRequestDocs(page, createTmpDir, 'test-wysiwyg-lists-code');

    const prosemirror = page.locator('.ProseMirror');
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();
    await page.keyboard.type('Item 1');

    await page.locator('.toolbar-btn[aria-label="Bullet list"]').click();
    await expect(prosemirror.locator('ul > li')).toContainText('Item 1');

    await page.keyboard.press('Enter');
    await page.keyboard.type('Item 2');

    await page.locator('.toolbar-btn[aria-label="Numbered list"]').click();
    await expect(prosemirror.locator('ol > li').nth(1)).toContainText('Item 2');

    await page.locator('.toolbar-btn[aria-label="Numbered list"]').click();
    await expect(prosemirror.locator('p').filter({ hasText: 'Item 2' })).toBeVisible();

    await page.locator('.toolbar-btn[aria-label="Task list"]').click();
    await expect(prosemirror.locator('ul[data-type="taskList"] > li')).toBeVisible();

    const checkbox = prosemirror.locator('ul[data-type="taskList"] > li label input[type="checkbox"]').first();
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    await page.locator('.toolbar-btn[aria-label="Code block"]').click();
    await page.keyboard.type('const x = 1;');
    await expect(prosemirror.locator('pre code')).toContainText('const x = 1;');
  });

  test('Table Insertion', async ({ page, createTmpDir }) => {
    await setupRequestDocs(page, createTmpDir, 'test-wysiwyg-table');

    const prosemirror = page.locator('.ProseMirror');
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();

    await page.locator('.toolbar-btn[aria-label="Table"]').click();

    await expect(prosemirror.locator('table')).toBeVisible();
    await expect(prosemirror.locator('tr')).toHaveCount(3);
  });
});
