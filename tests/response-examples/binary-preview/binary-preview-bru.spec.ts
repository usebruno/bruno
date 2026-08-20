import { test, expect, Page } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import { clickResponseAction, expandCollection, expandFolder } from '../../utils/page/actions';

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
    // Served as audio/mp4, but the preview trusts the sniffed bytes (M4A signature)
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

const openBinaryPreviewRequest = async (page: Page, folderName: string | undefined, requestName: string) => {
  const locators = buildCommonLocators(page);
  await expandCollection(page, 'collection');
  if (folderName) {
    await expandFolder(page, folderName);
    await locators.sidebar.folderRequest(folderName, requestName).click();
  } else {
    await locators.sidebar.request(requestName).click();
  }
};

const saveResponseAsExample = async (page: Page, requestName: string, exampleName: string) => {
  const { request, responseExample } = buildCommonLocators(page);
  await request.sendButton().click();
  await clickResponseAction(page, 'response-bookmark-btn');

  await responseExample.nameInput().clear();
  await responseExample.nameInput().fill(exampleName);
  await page.getByRole('button', { name: 'Create Example' }).click();
  await expect(responseExample.title()).toHaveText(`${requestName} / ${exampleName}`);
};

// The app instance (and its temp collection copy) is reused across tests and CI
// retries in a worker, so example names must be unique per attempt to avoid
// colliding with an example a failed attempt already created.
const uniqueExampleName = (exampleName: string, testInfo: { retry: number }) =>
  testInfo.retry ? `${exampleName} (retry ${testInfo.retry})` : exampleName;

test.describe('Binary response example previews', () => {
  for (const { requestName, folderName, exampleName, previewType, expectedMime } of binaryPreviewCases) {
    test(`should preview a saved ${previewType} response (${requestName})`, async ({ pageWithUserData: page }, testInfo) => {
      const savedExampleName = uniqueExampleName(exampleName, testInfo);

      await test.step('Open collection and request', async () => {
        await openBinaryPreviewRequest(page, folderName, requestName);
      });

      await test.step('Send request and save response as example', async () => {
        await saveResponseAsExample(page, requestName, savedExampleName);
      });

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

  test('should sniff the real content type when the header is mislabeled (binary-preview-mislabeled)', async ({ pageWithUserData: page }, testInfo) => {
    await test.step('Open collection and request', async () => {
      await openBinaryPreviewRequest(page, undefined, 'binary-preview-mislabeled');
    });

    await test.step('Send request and save response as example', async () => {
      await saveResponseAsExample(page, 'binary-preview-mislabeled', uniqueExampleName('Mislabeled Example', testInfo));
    });

    // The response is PNG bytes served with a text/plain header — the preview
    // trusts the sniffed bytes over the header and renders an image.
    await test.step('Verify the sniffed image preview renders', async () => {
      const preview = buildCommonLocators(page).responseExample.binaryPreview();
      await expect(preview).toBeVisible();
      await expect(preview).toHaveAttribute('data-preview-type', 'image');
      await expect(preview.locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/);
    });
  });

  test('should show the raw body when the bytes are not previewable (binary-preview-unknown-binary)', async ({ pageWithUserData: page }, testInfo) => {
    const locators = buildCommonLocators(page);

    await test.step('Open collection and request', async () => {
      await openBinaryPreviewRequest(page, undefined, 'binary-preview-unknown-binary');
    });

    await test.step('Send request and save response as example', async () => {
      await saveResponseAsExample(page, 'binary-preview-unknown-binary', uniqueExampleName('Unknown Binary Example', testInfo));
    });

    // application/octet-stream bytes with no recognizable signature have no
    // visual preview — the raw base64 body renders in the editor instead.
    await test.step('Verify the raw body renders instead of a binary preview', async () => {
      await expect(locators.responseExample.title()).toBeVisible();
      await expect(locators.responseExample.binaryPreview()).toHaveCount(0);
      await expect(locators.responseExample.responseContent().locator('.CodeMirror').first()).toContainText('AAECAwQFBgcI');
    });
  });
});
