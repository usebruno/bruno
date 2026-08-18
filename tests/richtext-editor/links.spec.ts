import { test, expect, Locator } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';
import { modifier } from '../shortcuts/helpers';
import { setupRequestDocs, clickDocsToolbarBtn } from './actions';

test.describe('Rich Text Editor Edge Cases - Links', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Creating, editing, and removing links', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-links');

    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    const editPopover = locators.docs.linkEditPopover();
    const hoverPopover = locators.docs.linkHoverPopover();
    let link: Locator;

    await test.step('Create a link', async () => {
      await prosemirror.click();
      await page.keyboard.type('here');

      // Select the word "here" (by pressing Shift+Left 4 times)
      await page.keyboard.down('Shift');
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowLeft');
      }
      await page.keyboard.up('Shift');

      // Click the Link button
      await clickDocsToolbarBtn(locators, 'Link');

      // The edit popover should appear
      await expect(editPopover).toBeVisible();

      // Fill in the URL
      await locators.docs.linkEditUrlInput().fill('https://example.com');
      await locators.docs.linkEditInsertBtn().click();

      // Check if the link is created in the editor
      link = prosemirror.locator('a[href="https://example.com"]');
      await expect(link).toHaveText('here');
    });

    await test.step('Edit the link via the hover popover', async () => {
      // Hover over the link to show the hover popover
      await link.hover();
      await expect(hoverPopover).toBeVisible();

      // Check if the URL is displayed correctly in the hover popover
      const linkUrlDisplay = locators.docs.linkHoverUrlDisplay();
      await expect(linkUrlDisplay).toHaveText('https://example.com');

      // We can just click the edit button inside the hover popover.
      // The edit button has an IconEdit.
      await locators.docs.linkHoverEditBtn().click();

      await expect(editPopover).toBeVisible();
      await locators.docs.linkEditUrlInput().fill('https://example.org');
      await locators.docs.linkEditSaveBtn().click();

      // Check if the link is updated
      link = prosemirror.locator('a[href="https://example.org"]');
      await expect(link).toHaveText('here');
    });

    await test.step('Remove the link via the hover popover', async () => {
      await link.hover();
      await expect(hoverPopover).toBeVisible();
      await locators.docs.linkHoverUnlinkBtn().click(); // The unlink icon

      // Check if the link is removed
      await expect(prosemirror.locator('a')).toHaveCount(0);
      // The text should still exist
      await expect(prosemirror).toContainText('here');
    });
  });
  test('Removing the correct link when multiple links exist', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-multiple-links');

    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    const linkOne = prosemirror.locator('a[href="https://one.com"]');
    const linkTwo = prosemirror.locator('a[href="https://two.com"]');

    await test.step('Create LinkOne and LinkTwo', async () => {
      await prosemirror.click();

      // Type LinkOne and select it
      await page.keyboard.type('LinkOne');
      await page.keyboard.down('Shift');
      for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowLeft');
      await page.keyboard.up('Shift');

      // Create LinkOne
      await clickDocsToolbarBtn(locators, 'Link');
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
      await clickDocsToolbarBtn(locators, 'Link');
      await locators.docs.linkEditUrlInput().fill('https://two.com');
      await locators.docs.linkEditInsertBtn().click();

      // Now we have two links.
      await expect(linkOne).toHaveText('LinkOne');
      await expect(linkTwo).toHaveText('LinkTwo');
    });

    await test.step('Unlink LinkTwo via the hover popover, leaving LinkOne intact', async () => {
      // Move the cursor into LinkOne without clicking (clicking opens the edit popover)
      // We are currently at the end of "LinkTwo": overshoot past the start of the
      // document, then step back onto it, since there's no direct "n characters back".
      await prosemirror.focus(); // Ensure editor has focus without clicking
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
      await locators.docs.linkHoverUnlinkBtn().click();

      // Verify LinkTwo is unlinked but text remains
      await expect(linkTwo).toHaveCount(0);
      await expect(prosemirror).toContainText('LinkTwo');

      // Verify LinkOne is still a link
      await expect(linkOne).toHaveCount(1);
    });
  });

  test('Link popovers - scroll tracking, hiding, and flipping', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-popper');
    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await test.step('Setup a tall document and a link', async () => {
      await prosemirror.click();

      // Type "Top Link" and select it
      await page.keyboard.type('Top Link');
      await page.keyboard.down('Shift');
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press('ArrowLeft');
      }
      await page.keyboard.up('Shift');

      // Create a link
      await clickDocsToolbarBtn(locators, 'Link');
      await locators.docs.linkEditUrlInput().fill('https://example.com');
      await locators.docs.linkEditInsertBtn().click();

      // Move cursor right to exit the link
      await page.keyboard.press('ArrowRight');

      // Type a lot of lines to make the editor scrollable
      const lines = Array.from({ length: 150 }, (_, i) => `Line ${i}`).join('\n');
      await page.keyboard.insertText('\n' + lines);

      await expect(prosemirror).toContainText('Line 149');
    });

    const link = prosemirror.locator('a[href="https://example.com"]');
    const hoverPopover = locators.docs.linkHoverPopover();

    await test.step('Scroll tracking', async () => {
      await link.hover();
      await expect(hoverPopover).toBeVisible();

      // Click edit so we have a stable popover that doesn't disappear on mouseout
      await locators.docs.linkHoverEditBtn().click();
      const editPopover = locators.docs.linkEditPopover();
      await expect(editPopover).toBeVisible();

      const initialBox = await editPopover.boundingBox();
      expect(initialBox).toBeTruthy();

      // Move mouse over the editor so the wheel event targets the scrollable container
      await prosemirror.hover();

      // Scroll down natively
      await page.mouse.wheel(0, 100);

      // Verify the popover moved up by checking its new y position, polling
      // since Popper's reposition happens asynchronously after the scroll.
      await expect.poll(async () => (await editPopover.boundingBox())?.y).toBeLessThan(initialBox!.y);
    });

    await test.step('Scroll hide', async () => {
      // Ensure mouse is still over the editor
      await prosemirror.hover();

      // Scroll down drastically so the link leaves the viewport
      await page.mouse.wheel(0, 1000);

      // Verify the popover is hidden (data-popper-reference-hidden applies visibility: hidden)
      const editPopover = locators.docs.linkEditPopover();
      await expect(editPopover).toBeHidden();

      // Scroll back up
      await page.mouse.wheel(0, -1100);

      // Wait for it to be visible again before pressing Escape
      await expect(editPopover).toBeVisible();

      // Close the edit popover
      await page.keyboard.press('Escape');
    });

    await test.step('Flipping (bottom of viewport)', async () => {
      // Create a link at the very bottom
      await prosemirror.click();

      // Go to the end of the document
      await page.keyboard.down(modifier);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.up(modifier);

      await page.keyboard.press('Enter');
      await page.keyboard.type('Bottom Link');

      // Select 'Bottom Link'
      await page.keyboard.down('Shift');
      for (let i = 0; i < 11; i++) {
        await page.keyboard.press('ArrowLeft');
      }
      await page.keyboard.up('Shift');

      // Create link
      await clickDocsToolbarBtn(locators, 'Link');
      const editPopover = locators.docs.linkEditPopover();

      await expect(editPopover).toBeVisible();

      // Since the link is at the absolute bottom of a long document,
      // the popover should flip and appear ABOVE the link.
      // Popper handles this automatically. We can verify if data-popper-placement starts with 'top'.
      await expect(editPopover).toHaveAttribute('data-popper-placement', /^top/);
    });
  });

  test('Internal vs external links in hover popover', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-richtext-link-redirection');
    const prosemirror = locators.docs.proseMirror();
    const hoverPopover = locators.docs.linkHoverPopover();

    await expect(prosemirror).toBeVisible();

    await test.step('Internal links should not open a new page', async () => {
      await prosemirror.click();
      await page.keyboard.type('Internal');

      await page.keyboard.down('Shift');
      for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowLeft');
      await page.keyboard.up('Shift');

      await clickDocsToolbarBtn(locators, 'Link');
      await locators.docs.linkEditUrlInput().fill('#preferences/ai');
      await locators.docs.linkEditInsertBtn().click();

      const internalLink = prosemirror.locator('a[href="#preferences/ai"]');
      await internalLink.hover();
      await expect(hoverPopover).toBeVisible();

      let popupOpened = false;
      page.once('popup', () => {
        popupOpened = true;
      });

      await locators.docs.linkHoverUrlDisplay().click();

      // Wait a short time to ensure no popup was opened
      await page.waitForTimeout(500);
      expect(popupOpened).toBe(false);
    });

    await test.step('External links should open a new page', async () => {
      // Move cursor to the end and create a new external link
      await prosemirror.click();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.type(' External');

      await page.keyboard.down('Shift');
      for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowLeft');
      await page.keyboard.up('Shift');

      await clickDocsToolbarBtn(locators, 'Link');
      await locators.docs.linkEditUrlInput().fill('https://example.org');
      await locators.docs.linkEditInsertBtn().click();

      const externalLink = prosemirror.locator('a[href="https://example.org"]');
      await externalLink.hover();
      await expect(hoverPopover).toBeVisible();

      // Click the external link.
      await locators.docs.linkHoverUrlDisplay().click();

      // Wait a short time to ensure no main window navigation occurred
      await page.waitForTimeout(500);
    });
  });
});
