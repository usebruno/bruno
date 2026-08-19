import { test, expect } from '../../../playwright';
import { clickResponseAction } from '../../utils/page/actions';

/**
 * Each fixture request POSTs to the local test server's /api/echo/custom
 * endpoint, which echoes back the embedded base64 payload as raw bytes
 * with the requested Content-Type. Saving that response as an example
 * should store the body as binary and render the matching preview.
 *
 * The collection is a temp copy (via collectionFixturePath), so saving
 * examples never mutates the committed fixture.
 */
const binaryPreviewCases = [
  {
    requestName: 'binary-preview-image-png',
    folderName: 'images',
    exampleName: 'PNG Example',
    previewType: 'image',
    expectedMime: 'image/png'
  },
  {
    requestName: 'binary-preview-image-jpeg',
    folderName: 'images',
    exampleName: 'JPEG Example',
    previewType: 'image',
    expectedMime: 'image/jpeg'
  },
  {
    requestName: 'binary-preview-image-gif',
    folderName: 'images',
    exampleName: 'GIF Example',
    previewType: 'image',
    expectedMime: 'image/gif'
  },
  {
    requestName: 'binary-preview-image-webp',
    folderName: 'images',
    exampleName: 'WebP Example',
    previewType: 'image',
    expectedMime: 'image/webp'
  },
  {
    requestName: 'binary-preview-pdf',
    exampleName: 'PDF Example',
    previewType: 'pdf'
  },
  {
    requestName: 'binary-preview-audio-wav',
    folderName: 'audio',
    exampleName: 'WAV Example',
    previewType: 'audio',
    expectedMime: 'audio/wav'
  },
  {
    requestName: 'binary-preview-audio-mp3',
    folderName: 'audio',
    exampleName: 'MP3 Example',
    previewType: 'audio',
    expectedMime: 'audio/mpeg'
  },
  {
    requestName: 'binary-preview-audio-m4a',
    folderName: 'audio',
    exampleName: 'AAC Example',
    previewType: 'audio',
    expectedMime: 'audio/mp4'
  },
  {
    requestName: 'binary-preview-video-webm',
    folderName: 'video',
    exampleName: 'WebM Example',
    previewType: 'video'
  },
  {
    requestName: 'binary-preview-video-mp4',
    folderName: 'video',
    exampleName: 'MP4 Example',
    previewType: 'video'
  }
];

test.describe.serial('Binary response example previews', () => {
  for (const { requestName, folderName, exampleName, previewType, expectedMime } of binaryPreviewCases) {
    test(`should preview a saved ${previewType} response (${requestName})`, async ({ pageWithUserData: page }) => {
      await test.step('Open collection and request', async () => {
        await page.locator('#sidebar-collection-name').filter({ hasText: 'collection' }).click();
        const requestRow = page.locator('.collection-item-name').filter({ has: page.getByText(requestName, { exact: true }) });
        // Collapsed folders don't render their children, and folder expansion
        // persists across serial tests — only toggle when the row is hidden
        if (folderName && !(await requestRow.isVisible())) {
          await page.locator('.collection-item-name').filter({ has: page.getByText(folderName, { exact: true }) }).click();
        }
        await requestRow.click();
      });

      await test.step('Send request and save response as example', async () => {
        await page.getByTestId('send-arrow-icon').click();
        await clickResponseAction(page, 'response-bookmark-btn');

        await page.getByTestId('create-example-name-input').clear();
        await page.getByTestId('create-example-name-input').fill(exampleName);
        await page.getByRole('button', { name: 'Create Example' }).click();
        await expect(page.getByTestId('response-example-title')).toHaveText(`${requestName} / ${exampleName}`);
      });

      await test.step('Verify the binary preview renders', async () => {
        const preview = page.getByTestId('response-example-binary-preview');
        await expect(preview).toBeVisible();
        await expect(preview).toHaveAttribute('data-preview-type', previewType);

        if (previewType === 'image') {
          await expect(preview.locator('img')).toHaveAttribute('src', new RegExp(`^data:${expectedMime};base64,`));
        } else if (previewType === 'pdf') {
          await expect(preview.locator('.preview-pdf canvas').first()).toBeVisible();
        } else if (previewType === 'audio') {
          await expect(preview.locator('audio')).toHaveAttribute('src', new RegExp(`^data:${expectedMime};base64,`));
        } else if (previewType === 'video') {
          // VideoPreview serves the bytes through a blob URL, not a data URI
          await expect(preview.locator('video')).toHaveAttribute('src', /^blob:/);
        }
      });
    });
  }

  test('should show the raw body when the content-type header is not previewable (binary-preview-mislabeled)', async ({ pageWithUserData: page }) => {
    await test.step('Open collection and request', async () => {
      await page.locator('#sidebar-collection-name').filter({ hasText: 'collection' }).click();
      await page.locator('.collection-item-name').filter({ has: page.getByText('binary-preview-mislabeled', { exact: true }) }).click();
    });

    await test.step('Send request and save response as example', async () => {
      await page.getByTestId('send-arrow-icon').click();
      await clickResponseAction(page, 'response-bookmark-btn');

      await page.getByTestId('create-example-name-input').clear();
      await page.getByTestId('create-example-name-input').fill('Mislabeled Example');
      await page.getByRole('button', { name: 'Create Example' }).click();
      await expect(page.getByTestId('response-example-title')).toHaveText('binary-preview-mislabeled / Mislabeled Example');
    });

    await test.step('Verify the raw body renders instead of a binary preview', async () => {
      await expect(page.getByTestId('response-example-binary-preview')).toHaveCount(0);
      await expect(page.locator('.code-editor-container .CodeMirror')).toContainText('iVBORw0KGgo');
    });
  });
});
