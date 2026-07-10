import { test, expect } from '../../../playwright';
import { createCollection, closeAllCollections } from '../../utils/page/actions';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Wysiwyg Docs Editor Edge Cases', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  const setupRequestDocs = async (page: any, createTmpDir: any, collectionName: string) => {
    const tmpDir = await createTmpDir(collectionName);
    const locators = buildCommonLocators(page);
    await createCollection(page, collectionName, tmpDir);
    await locators.sidebar.collection(collectionName).hover();
    await locators.actions.collectionActions(collectionName).click();
    await locators.dropdown.item('New Request').click();
    await page.getByTestId('request-name').fill('test-req');
    await locators.modal.button('Create').click();

    // Wait for request tab to be visible
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'test-req' })).toBeVisible();

    // Wait for the request pane to render
    await page.waitForSelector('.request-pane');

    // Wait for ResponsiveTabs to finish calculating and render tabs or the more-tabs dropdown
    const docsTab = page.getByTestId('responsive-tab-docs');
    const moreTabs = page.locator('.more-tabs');
    await expect(docsTab.or(moreTabs)).toBeVisible();

    // Open Docs tab (handle ResponsiveTabs overflow)
    if (await docsTab.isVisible()) {
      await docsTab.click();
    } else {
      await page.locator('.more-tabs').click();
      await page.locator('.dropdown-item').filter({ hasText: 'Docs' }).click();
    }

    // Switch to Edit mode
    const editTab = page.locator('.docs-tab').filter({ hasText: /^Edit$/ });
    await editTab.click();

    return locators;
  };

  test('Markdown <-> WYSIWYG Compatibility and Line Breaks', async ({ page, createTmpDir }) => {
    await setupRequestDocs(page, createTmpDir, 'test-wysiwyg-markdown-table');

    // Switch to Markdown mode to write raw markdown
    const modeSwitch = page.locator('.docs-mode-switch');
    await modeSwitch.click();

    // Type markdown table
    const markdownContent = `| Header 1 | Header 2 |\n|----------|----------|\n| Row 1 Col 1 | Row 1 Col 2 |\n| Row 2 Col 1<br/>Line 2 | Row 2 Col 2 |`;

    const codeMirror = page.locator('.docs-tab-strip + div .CodeMirror');
    await codeMirror.waitFor({ state: 'visible' });

    // Set value and trigger React onEdit directly to ensure Redux sync
    await page.evaluate(
      ({ el, val }) => {
        const cm = (el as any).CodeMirror;
        cm.setValue(val);

        let currentEl = el;
        let reactKey = null;
        while (currentEl && !reactKey) {
          reactKey = Object.keys(currentEl).find((k) => k.startsWith('__reactFiber$'));
          if (!reactKey) currentEl = currentEl.parentElement;
        }

        if (reactKey && currentEl) {
          let node = (currentEl as any)[reactKey];
          while (node) {
            if (node.memoizedProps && node.memoizedProps.onEdit) {
              node.memoizedProps.onEdit(val);
              break;
            }
            node = node.return;
          }
        }
      },
      { el: await codeMirror.elementHandle(), val: markdownContent }
    );

    // Give it a tiny moment to sync to Redux
    await page.waitForTimeout(100);

    // Switch to WYSIWYG mode
    await modeSwitch.click();

    const prosemirror = page.locator('.ProseMirror');
    await expect(prosemirror.locator('table')).toBeVisible();
    await expect(prosemirror.locator('td').nth(2)).toContainText('Row 2 Col 1Line 2');

    // Switch back to Markdown and verify the original markdown is intact (no corruption)
    await modeSwitch.click();
    const textAreaValue = await page.locator('.docs-tab-strip + div .CodeMirror').innerText();
    expect(textAreaValue).toContain('| Header 1 | Header 2 |');
    expect(textAreaValue).toContain('| Row 2 Col 1<br/>Line 2 | Row 2 Col 2 |');
  });

  test('Checkboxes formatting, toggling, and Link behavior in Preview', async ({ page, createTmpDir, context }) => {
    await setupRequestDocs(page, createTmpDir, 'test-wysiwyg-checkboxes');

    // Switch to Markdown mode to write raw markdown
    const modeSwitch = page.locator('.docs-mode-switch');
    await modeSwitch.click();

    // Write Task List
    const markdownContent = `- [ ] Task 1\n- [x] Task 2\n- [ ] [Link](https://google.com)`;
    const codeMirror = page.locator('.docs-tab-strip + div .CodeMirror');
    await codeMirror.waitFor({ state: 'visible' });

    // Set value and trigger React onEdit directly to ensure Redux sync
    await page.evaluate(
      ({ el, val }) => {
        const cm = (el as any).CodeMirror;
        cm.setValue(val);

        let currentEl = el;
        let reactKey = null;
        while (currentEl && !reactKey) {
          reactKey = Object.keys(currentEl).find((k) => k.startsWith('__reactFiber$'));
          if (!reactKey) currentEl = currentEl.parentElement;
        }

        if (reactKey && currentEl) {
          let node = (currentEl as any)[reactKey];
          while (node) {
            if (node.memoizedProps && node.memoizedProps.onEdit) {
              node.memoizedProps.onEdit(val);
              break;
            }
            node = node.return;
          }
        }
      },
      { el: await codeMirror.elementHandle(), val: markdownContent }
    );

    // Give it a tiny moment to sync to Redux
    await page.waitForTimeout(100);

    // Switch to Preview mode
    const previewTab = page.locator('.docs-tab').filter({ hasText: /^Preview$/ });
    await previewTab.click();

    const prosemirror = page.locator('.ProseMirror');
    await expect(prosemirror).toBeVisible();

    // Verify Task 2 is checked and has line-through styling
    const checkedItem = prosemirror.locator('li[data-checked="true"]');
    await expect(checkedItem).toContainText('Task 2');
    const checkedItemLabel = checkedItem.locator('.label-content');
    await expect(checkedItemLabel).toHaveCSS('text-decoration', /line-through/);

    // Click on Task 1 label and verify it becomes checked
    const uncheckedItem1 = prosemirror.locator('li[data-checked="false"]').filter({ hasText: 'Task 1' });
    const uncheckedItem1Label = uncheckedItem1.locator('.label-content');
    await uncheckedItem1Label.click();

    // It should now be checked
    await expect(prosemirror.locator('li[data-checked="true"]').filter({ hasText: 'Task 1' })).toBeVisible();

    // Click link in Task 3 -> should NOT toggle checkbox
    const task3 = prosemirror.locator('li').filter({ hasText: 'Link' });
    const link = task3.locator('a');

    // Listen for new page (link opens in new tab)
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      link.click()
    ]);
    expect(newPage).toBeTruthy();
    await newPage.close();

    // Task 3 should STILL be unchecked
    await expect(task3).toHaveAttribute('data-checked', 'false');

    // Go back to Edit
    const editTab = page.locator('.docs-tab').filter({ hasText: /^Edit$/ });
    await editTab.click();

    // Edit tab defaults back to WYSIWYG, we need to switch to Markdown
    await modeSwitch.click();

    const textAreaValue = await page.locator('.docs-tab-strip + div .CodeMirror').innerText();
    expect(textAreaValue).toContain('- [x] Task 1'); // Updated
    expect(textAreaValue).toContain('- [x] Task 2'); // Maintained
    expect(textAreaValue).toContain('- [ ] [Link](https://google.com)'); // Maintained
  });

  test('Line-Level Formatting', async ({ page, createTmpDir }) => {
    await setupRequestDocs(page, createTmpDir, 'test-wysiwyg-line-formatting');

    // We are in WYSIWYG mode by default
    const prosemirror = page.locator('.ProseMirror');
    await expect(prosemirror).toBeVisible();

    // Type two lines using keyboard to create separate paragraphs
    await prosemirror.click();
    await page.keyboard.type('Line 1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Line 2');

    // Move cursor to Line 1
    await page.keyboard.press('ArrowUp');

    // Click Heading 1 button in toolbar (via dropdown)
    await page.locator('.heading-dropdown-trigger:not([data-toolbar-part="heading"])').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Heading 1' }).click();

    // Verify only Line 1 is H1, Line 2 is still paragraph
    await expect(prosemirror.locator('h1')).toHaveCount(1);
    await expect(prosemirror.locator('h1')).toContainText('Line 1');
    await expect(prosemirror.locator('p')).toContainText('Line 2');
  });

  test('Toolbar Tooltips visibility', async ({ page, createTmpDir }) => {
    await setupRequestDocs(page, createTmpDir, 'test-wysiwyg-tooltips');

    // We are in WYSIWYG mode by default, ensure toolbar is visible
    const boldButton = page.locator('.toolbar-btn[aria-label="Bold"]');
    await expect(boldButton).toBeVisible();

    // Hover over Bold button
    await boldButton.hover();

    // Verify tooltip is visible
    await expect(page.locator('.react-tooltip').filter({ hasText: 'Bold' })).toBeVisible();
  });
});
