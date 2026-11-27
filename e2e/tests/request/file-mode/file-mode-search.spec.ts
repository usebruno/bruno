import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  openRequest,
  pressFindInFileMode,
  switchToFileMode
} from '../../../pages';

const REQUEST_NAME = 'search-sample';

test.describe('File mode - Cmd/Ctrl+F search', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('TC-3382: Cmd/Ctrl+F focuses the search input every time in file mode', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const { fileMode } = buildCommonLocators(page);

    for (const format of ['bru', 'yml']) {
      await openRequest(page, `file-mode-${format}`, REQUEST_NAME);
      await switchToFileMode(page);

      await fileMode.editor().click();
      await pressFindInFileMode(page);

      await test.step(`[${format}] Verify the search input is focused`, async () => {
        await expect(fileMode.search.input()).toBeFocused();
      });

      for (let attempt = 1; attempt <= 3; attempt++) {
        await test.step(`[${format}] Attempt ${attempt}: click back into the file, search bar stays open`, async () => {
          await fileMode.editor().click();
          await expect(fileMode.search.input()).not.toBeFocused();
        });

        await pressFindInFileMode(page);

        await test.step(`[${format}] Attempt ${attempt}: verify the search input is focused again`, async () => {
          await expect(fileMode.search.input()).toBeFocused();
        });
      }
    }
  });
});
