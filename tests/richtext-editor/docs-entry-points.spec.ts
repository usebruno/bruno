import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';
import { setupCollectionDocs, setupFolderDocs } from './actions';

test.describe('Rich Text Editor Edge Cases - Collection and Folder Docs Entry Points', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Collection docs: Cancel discards the draft, Save persists it', async ({ page, createTmpDir }) => {
    const locators = await setupCollectionDocs(page, createTmpDir, 'test-collection-docs');
    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await test.step('Cancel discards the edit', async () => {
      await prosemirror.click();
      await page.keyboard.type('Draft content that should be discarded');
      await expect(prosemirror).toContainText('Draft content that should be discarded');

      await locators.docs.collectionDocsCancelBtn().click();
      await expect(locators.docs.collectionDocsEditToggle()).toBeVisible();

      await locators.docs.collectionDocsEditToggle().click();
      await expect(locators.docs.proseMirror()).not.toContainText('Draft content that should be discarded');
    });

    await test.step('Save persists the edit', async () => {
      await prosemirror.click();
      await page.keyboard.type('Saved documentation content');

      await locators.docs.collectionDocsSaveBtn().click();
      await expect(locators.docs.collectionDocsEditToggle()).toBeVisible();

      await locators.docs.collectionDocsEditToggle().click();
      await expect(locators.docs.proseMirror()).toContainText('Saved documentation content');
    });
  });

  test('Folder docs: switching to Preview keeps the unsaved draft (no discard control), Save persists it', async ({ page, createTmpDir }) => {
    const locators = await setupFolderDocs(page, createTmpDir, 'test-folder-docs');
    const prosemirror = locators.docs.proseMirror();
    await expect(prosemirror).toBeVisible();

    await prosemirror.click();
    await page.keyboard.type('Folder documentation draft');
    await expect(prosemirror).toContainText('Folder documentation draft');

    await test.step('Toggling to Preview without saving keeps the draft', async () => {
      await locators.docs.folderDocsEditToggle().click();
      await expect(locators.docs.proseMirror()).toContainText('Folder documentation draft');
    });

    await test.step('Save persists the draft', async () => {
      await locators.docs.folderDocsEditToggle().click();
      await locators.docs.folderDocsSaveBtn().click();
      await expect(locators.docs.proseMirror()).toContainText('Folder documentation draft');
    });
  });
});
