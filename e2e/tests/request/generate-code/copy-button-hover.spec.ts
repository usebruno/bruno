import { expect, test } from '../../../playwright';
import {
  closeGenerateCodeDialog,
  getGeneratedSnippet,
  openCollection,
  openRequestInFolder
} from '../../../pages';

const COLLECTION = 'generate-code-encoding';
const FOLDER = 'requests';

// The copy button used to sit on top of the snippet permanently, hiding the end of the lines
// under it. It should only show up while the code block is hovered, so the code stays readable.
test.describe('Generate Code – copy button', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeGenerateCodeDialog(page);
  });

  test('copy button is hidden until the code block is hovered', async ({ pageWithUserData: page }) => {
    await test.step('Open request and Generate Code dialog', async () => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'cookie-header-single');
      await getGeneratedSnippet(page);
    });

    const dialog = page.getByRole('dialog');
    const copyButton = dialog.getByRole('button', { name: 'Copy to clipboard' });
    const codeBlock = dialog.locator('.editor-content .CodeMirror').first();

    await test.step('Copy button is hidden while the code block is not hovered', async () => {
      await dialog.getByTestId('interpolate-vars-toggle').hover();
      await expect(copyButton).toBeHidden();
    });

    await test.step('Copy button shows up when the code block is hovered', async () => {
      await codeBlock.hover();
      await expect(copyButton).toBeVisible();
    });

    await test.step('Copy button hides again when the pointer leaves the code block', async () => {
      await dialog.getByTestId('interpolate-vars-toggle').hover();
      await expect(copyButton).toBeHidden();
    });
  });
});
