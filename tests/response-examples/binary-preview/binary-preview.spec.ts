import { test, expect } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import { openCollectionRequest, sendReqAndSaveResposeExample } from '../../utils/page/response-example';

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
    expectedMime: 'audio/m4a'
  },
  {
    requestName: 'binary-preview-video-webm',
    folderName: 'video',
    exampleName: 'WebM Example',
    previewType: 'video',
    expectedMime: 'video/webm'
  },
  {
    requestName: 'binary-preview-video-mp4',
    folderName: 'video',
    exampleName: 'MP4 Example',
    previewType: 'video',
    expectedMime: 'video/mp4'
  }
];

test.describe('Binary response example previews', () => {
  for (const { requestName, folderName, exampleName, previewType, expectedMime } of binaryPreviewCases) {
    test(`should preview a saved ${previewType} response (${requestName})`, async ({ pageWithUserData: page }) => {
      await openCollectionRequest(page, 'binary-preview', folderName, requestName);
      await sendReqAndSaveResposeExample(page, requestName, exampleName);

      await test.step('Verify the binary preview renders', async () => {
        const preview = buildCommonLocators(page).responseExample.binaryPreview();
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

  test('should sniff the real content type when the header is mislabeled (binary-preview-mislabeled)', async ({ pageWithUserData: page }) => {
    await openCollectionRequest(page, 'binary-preview', undefined, 'binary-preview-mislabeled');
    await sendReqAndSaveResposeExample(page, 'binary-preview-mislabeled', 'Mislabeled Example');

    await test.step('Verify the sniffed image preview renders', async () => {
      const preview = buildCommonLocators(page).responseExample.binaryPreview();
      await expect(preview).toBeVisible();
      await expect(preview).toHaveAttribute('data-preview-type', 'image');
      await expect(preview.locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/);
    });
  });

  test('should show the raw body when the bytes are not previewable (binary-preview-unknown-binary)', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await openCollectionRequest(page, 'binary-preview', undefined, 'binary-preview-unknown-binary');
    await sendReqAndSaveResposeExample(page, 'binary-preview-unknown-binary', 'Unknown Binary Example');

    // application/octet-stream bytes with no recognizable signature have no
    // visual preview — the raw base64 body renders in the editor instead.
    await test.step('Verify the raw body renders instead of a binary preview', async () => {
      await expect(locators.responseExample.title()).toBeVisible();
      await expect(locators.responseExample.binaryPreview()).toHaveCount(0);
      await expect(locators.responseExample.responseContent().locator('.CodeMirror').first()).toContainText('AAECAwQFBgcI');
    });
  });
});
