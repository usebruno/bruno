import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';
import { setupRequestDocs } from './actions';

test.describe('Rich Text Editor Edge Cases - Links', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Creating, editing, and removing links', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-links');

    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();
    await page.keyboard.type('here');

    // Select the word "here" (by pressing Shift+Left 4 times)
    await page.keyboard.down('Shift');
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('ArrowLeft');
    }
    await page.keyboard.up('Shift');

    // Click the Link button in the toolbar
    const linkButton = locators.docs.toolbarBtn('Link');
    await expect(linkButton).toBeVisible();
    await linkButton.click();

    // The edit popover should appear
    const editPopover = locators.docs.linkEditPopover();
    await expect(editPopover).toBeVisible();

    // Fill in the URL
    await locators.docs.linkEditUrlInput().fill('https://example.com');
    await locators.docs.linkEditInsertBtn().click();

    // Check if the link is created in the editor
    const link = prosemirror.locator('a[href="https://example.com"]');
    await expect(link).toHaveText('here');

    // Hover over the link to show the hover popover
    await link.hover();

    const hoverPopover = locators.docs.linkHoverPopover();
    await expect(hoverPopover).toBeVisible();

    // Check if the URL is displayed correctly in the hover popover
    const linkUrlDisplay = locators.docs.linkHoverUrlDisplay();
    await expect(linkUrlDisplay).toHaveText('https://example.com');

    // We can just click the edit button inside the hover popover.
    // The edit button has an IconEdit.
    await locators.docs.linkHoverEditBtn().evaluate((node: HTMLElement) => node.click());

    await expect(editPopover).toBeVisible();
    await locators.docs.linkEditUrlInput().fill('https://example.org');
    await locators.docs.linkEditSaveBtn().click();

    // Check if the link is updated
    const updatedLink = prosemirror.locator('a[href="https://example.org"]');
    await expect(updatedLink).toHaveText('here');

    // Remove the link
    await updatedLink.hover();
    await expect(hoverPopover).toBeVisible();
    await locators.docs.linkHoverUnlinkBtn().evaluate((node: HTMLElement) => node.click()); // The unlink icon

    // Check if the link is removed
    await expect(prosemirror.locator('a')).toHaveCount(0);
    // The text should still exist
    await expect(prosemirror).toContainText('here');
  });
  test('Removing the correct link when multiple links exist', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-multiple-links');

    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();

    // Type LinkOne and select it
    await page.keyboard.type('LinkOne');
    await page.keyboard.down('Shift');
    for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowLeft');
    await page.keyboard.up('Shift');

    // Create LinkOne
    const linkButton = locators.docs.toolbarBtn('Link');
    await linkButton.click();
    await locators.docs.linkEditUrlInput().fill('https://one.com');
    await locators.docs.linkEditInsertBtn().click();

    // Move cursor to end and type the rest
    await page.keyboard.press('ArrowRight');
    await page.keyboard.type(' and ');

    // Type LinkTwo and select it
    await page.keyboard.type('LinkTwo');
    await page.keyboard.down('Shift');
    for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowLeft');
    await page.keyboard.up('Shift');

    // Create LinkTwo
    await linkButton.click();
    await locators.docs.linkEditUrlInput().fill('https://two.com');
    await locators.docs.linkEditInsertBtn().click();

    // Now we have two links.
    const linkOne = prosemirror.locator('a[href="https://one.com"]');
    const linkTwo = prosemirror.locator('a[href="https://two.com"]');
    await expect(linkOne).toHaveText('LinkOne');
    await expect(linkTwo).toHaveText('LinkTwo');

    // Move the cursor into LinkOne without clicking (clicking opens the edit popover)
    // We are currently at the end of "LinkTwo". We need to go back ~10 characters.
    await prosemirror.click(); // Ensure editor has focus, this clicks in the middle or end
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('ArrowLeft');
    }
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowRight');
    }

    // Now hover over LinkTwo
    await linkTwo.hover();

    const hoverPopover = locators.docs.linkHoverPopover();
    await expect(hoverPopover).toBeVisible();
    await expect(locators.docs.linkHoverUrlDisplay()).toHaveText('https://two.com');

    // Click the unlink button on the hover popover (which should unlink LinkTwo)
    await locators.docs.linkHoverUnlinkBtn().evaluate((node: HTMLElement) => node.click());

    // Verify LinkTwo is unlinked but text remains
    await expect(linkTwo).toHaveCount(0);
    await expect(prosemirror).toContainText('LinkTwo');

    // Verify LinkOne is still a link
    await expect(linkOne).toHaveCount(1);
  });
});
