import { expect, test } from '../../../playwright';
import {
  buildGenerateCodeLocators,
  closeGenerateCodeDialog,
  getGeneratedSnippet,
  openCollection,
  openRequestInFolder
} from '../../../pages';

const COLLECTION = 'generate-code-encoding';
const FOLDER = 'requests';

// The copy button used to sit on top of the snippet permanently, hiding the end of the lines
// under it. It should only show up while the code block is hovered or the button has keyboard
// focus, so the code stays readable. It is hidden with opacity (not removed from the layout),
// so the assertions check opacity rather than Playwright's visibility.
test.describe('Generate Code – copy button', () => {
  test.beforeEach(async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'cookie-header-single');
    await getGeneratedSnippet(page);
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeGenerateCodeDialog(page);
  });

  test('copy button only shows while the code block is hovered', async ({ pageWithUserData: page }) => {
    const { codeEditor, copyButton, interpolateToggle } = buildGenerateCodeLocators(page);

    await test.step('Hidden while the code block is not hovered', async () => {
      await interpolateToggle().hover();
      await expect(copyButton()).toHaveCSS('opacity', '0');
    });

    await test.step('Shown when the code block is hovered', async () => {
      await codeEditor().hover();
      await expect(copyButton()).toHaveCSS('opacity', '1');
    });

    await test.step('Hidden again when the pointer leaves the code block', async () => {
      await interpolateToggle().hover();
      await expect(copyButton()).toHaveCSS('opacity', '0');
    });
  });

  test('copy button is reachable with Tab and shows while focused', async ({ pageWithUserData: page }) => {
    const { copyButton, interpolateToggle } = buildGenerateCodeLocators(page);

    await test.step('Pointer away from the code block, so only focus can reveal the button', async () => {
      await interpolateToggle().hover();
      await expect(copyButton()).toHaveCSS('opacity', '0');
    });

    await test.step('Tab from the last toolbar control moves focus to the copy button', async () => {
      await interpolateToggle().focus();
      await page.keyboard.press('Tab');
      await expect(copyButton()).toBeFocused();
    });

    await test.step('Focused copy button is shown', async () => {
      await expect(copyButton()).toHaveCSS('opacity', '1');
    });
  });
});
