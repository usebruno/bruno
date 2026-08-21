import { test, expect, Page } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import { clickResponseAction, expandCollection, expandFolder } from '../../utils/page/actions';

/**
 * Same flow as binary-preview-bru.spec.ts, but against a collection stored in the
 * OpenCollection `.yml` format: each fixture request POSTs to the local test
 * server's /api/echo/custom endpoint, which echoes back the embedded base64
 * payload as raw bytes with the requested Content-Type. Saving that response as
 * an example should store the body as binary and render the matching preview.
 *
 * The collection is a temp copy (via collectionFixturePath), so saving
 * examples never mutates the committed fixture.
 */
const imagePreviewCases = [
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
  }
];

const openBinaryPreviewRequest = async (page: Page, folderName: string, requestName: string) => {
  const locators = buildCommonLocators(page);
  await expandCollection(page, 'yml-collection');
  await expandFolder(page, folderName);
  await locators.sidebar.folderRequest(folderName, requestName).click();
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

test.describe('Binary response example previews (yml collection)', () => {
  for (const { requestName, folderName, exampleName, previewType, expectedMime } of imagePreviewCases) {
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
        await expect(preview.locator('img')).toHaveAttribute('src', new RegExp(`^data:${expectedMime};base64,`));
      });
    });
  }
});
