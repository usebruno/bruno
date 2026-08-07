import { test, expect } from '../../playwright';
import { closeAllCollections, setRequestUrlAndSave } from '../utils/page/actions';
import { setupRequestDocs } from './actions';
import { modifier, pressShortcut, remapKeybinding, resetKeybindings } from '../shortcuts/helpers';

// keybinding which is bound in Tiptap and also has a global handler (Cmd/Ctrl+B) should not trigger the global handler when docs is focused.
// keybinding which is not bound in Tiptap (Cmd/Ctrl+,) should still trigger the global handler when docs is focused.
test.describe('Rich Text Editor - Keyboard Shortcut Interop with Global Hotkeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('a shortcut Tiptap does not bind still reaches the global handler while docs is focused', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-docs-shortcut-passthrough');
    const prosemirror = locators.docs.proseMirror();

    await test.step('Type into docs', async () => {
      await expect(prosemirror).toBeVisible();
      await prosemirror.click();
      await page.keyboard.type('Some docs content');
    });

    await test.step('Open Preferences (Cmd/Ctrl+,) still fires — no Tiptap binding for it', async () => {
      await pressShortcut(page, modifier, 'Comma');
      await expect(locators.tabs.requestTab('Preferences')).toBeVisible();
    });
  });

  test('Cmd/Ctrl+N (no Tiptap binding) opens the New Request modal while docs is focused', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-docs-shortcut-new-request');
    const prosemirror = locators.docs.proseMirror();

    await test.step('Type into docs', async () => {
      await expect(prosemirror).toBeVisible();
      await prosemirror.click();
      await page.keyboard.type('Some docs content');
    });

    await test.step('Cmd/Ctrl+N still opens the New Request modal', async () => {
      await pressShortcut(page, modifier, 'KeyN');
      const newRequestModal = locators.modal.byTitle('New Request');
      await expect(newRequestModal).toBeVisible();
      await locators.modal.closeButton().click();
    });
  });

  test('Cmd/Ctrl+Enter inside docs inserts a hard break, not the global Send Request shortcut', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-docs-shortcut-send-request');
    const prosemirror = locators.docs.proseMirror();

    await test.step('Give the request a real URL, so a regression (Send Request also firing) would be unambiguous', async () => {
      await setRequestUrlAndSave(page, 'https://echo.usebruno.com');
      await expect(prosemirror).toBeVisible();
    });

    await test.step('Cmd/Ctrl+Enter inserts a hard break (Tiptap\'s HardBreak binding)', async () => {
      await prosemirror.click();
      await page.keyboard.type('Line one');
      // Mod-Enter is Tiptap's HardBreak binding and Bruno's global "Send Request" shortcut.
      await pressShortcut(page, modifier, 'Enter');
      await page.keyboard.type('Line two');

      // A hard break keeps both lines in the same paragraph. a real Enter
      // (new paragraph) would split them into two separate <p> elements.
      await expect(prosemirror.locator('p')).toHaveCount(1);
      await expect(prosemirror.locator('p br')).toHaveCount(1);
      await expect(prosemirror.locator('p')).toContainText('Line oneLine two');
    });

    await test.step('The global Send Request shortcut did not also fire', async () => {
      // The Send Request shortcut would have changed button text from Send to Cancel
      await expect(locators.request.sendButton()).toBeVisible();
      await expect(locators.request.sendButton()).not.toHaveAttribute('data-action', 'cancel');
      // check for response status code which will present if the request was sent
      await expect(locators.response.statusCode()).toHaveCount(0);
    });
  });

  test('typing the bare "b" key (no modifier) just inserts text', async ({ page, createTmpDir }) => {
    const locators = await setupRequestDocs(page, createTmpDir, 'test-docs-shortcut-bare-key');
    const prosemirror = locators.docs.proseMirror();

    await test.step('Type a bare "b"', async () => {
      await expect(prosemirror).toBeVisible();
      await prosemirror.click();
      await page.keyboard.type('b');
    });

    await test.step('It is inserted as plain text, not bolded', async () => {
      await expect(prosemirror).toContainText('b');
      await expect(prosemirror.locator('strong')).toHaveCount(0);
    });
  });
});

test.describe('Rich Text Editor - Keyboard Shortcut with Global Hotkeys (remapped)', () => {
  // we are remapping the preferences shortcuts which will store in keybindings.json.
  // now we need to use pageWithUserData so that other tests don't get affected by the remapping.
  test.beforeEach(async ({ pageWithUserData: page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    await resetKeybindings(page);
    await closeAllCollections(page);
  });

  test('a shortcut Tiptap does bind only runs the editor action, not a colliding global shortcut', async ({ pageWithUserData: page, createTmpDir }) => {
    await test.step('Remap Open Preferences shortcut to Cmd/Ctrl+B which is same combo Tiptap Bold binds', async () => {
      await remapKeybinding(page, 'openPreferences', modifier, 'KeyB');
    });

    const locators = await setupRequestDocs(page, createTmpDir, 'test-docs-shortcut-collision');
    const prosemirror = locators.docs.proseMirror();

    await test.step('Select text in docs', async () => {
      await expect(prosemirror).toBeVisible();
      await prosemirror.click();
      await page.keyboard.type('Hello World');
      await page.keyboard.down('Shift');
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('ArrowLeft');
      }
      await page.keyboard.up('Shift');
    });

    await test.step('Cmd/Ctrl+B only bolds the selection. it does not open Preferences', async () => {
      await pressShortcut(page, modifier, 'KeyB');
      await expect(prosemirror.locator('strong')).toHaveText('World');
      await expect(locators.tabs.requestTab('Preferences')).not.toBeVisible();
    });
  });
});
