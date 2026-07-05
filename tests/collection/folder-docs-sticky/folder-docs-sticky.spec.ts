import { test, expect } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import { createCollection, createFolder, closeAllCollections } from '../../utils/page/actions';

test.describe('Folder docs sticky edit/preview button', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('edit/preview button should remain visible when scrolling folder docs', async ({ page, createTmpDir }) => {
    const tmpDir = await createTmpDir('folder-docs-sticky');
    const locators = buildCommonLocators(page);

    // Create collection and folder
    await createCollection(page, 'sticky-docs-test', tmpDir);
    await createFolder(page, 'test-folder', 'sticky-docs-test');

    // Click on the folder to open folder settings
    await locators.sidebar.folder('test-folder').click();

    // Navigate to the Docs tab
    const docsTab = locators.paneTabs.folderSettingsTab('docs');
    await docsTab.click();

    // The editing-mode toggle should show "Edit" initially
    const editToggle = page.locator('.editing-mode');
    await expect(editToggle).toBeVisible();
    await expect(editToggle).toHaveText('Edit');

    // Click "Edit" to enter editing mode
    await editToggle.click();
    await expect(editToggle).toHaveText('Preview');

    // Type long content into the CodeMirror editor to make it scrollable
    const codeMirror = page.locator('.CodeMirror');
    await codeMirror.click();
    const longContent = Array.from({ length: 60 }, (_, i) => `Line ${i + 1}: Some documentation content to make this area scrollable.`).join('\n');
    await page.locator('.CodeMirror textarea').fill(longContent);

    // Save the docs
    await page.getByRole('button', { name: 'Save' }).click();

    // Switch to preview mode to see rendered markdown
    await editToggle.click();
    await expect(editToggle).toHaveText('Edit');

    // Get the StyledWrapper (parent of editing-mode) which is the scroll container
    const scrollContainer = editToggle.locator('..');

    // Scroll down within the docs container
    await scrollContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    // The edit/preview toggle should still be visible due to sticky positioning
    await expect(editToggle).toBeVisible();
    await expect(editToggle).toBeInViewport();
  });
});
