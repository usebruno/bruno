import { test, expect } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import { openCollectionRequest, sendReqAndSaveResposeExample } from '../../utils/page/response-example';

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

const uniqueExampleName = (exampleName: string, testInfo: { retry: number }) =>
  testInfo.retry ? `${exampleName} (retry ${testInfo.retry})` : exampleName;

test.describe('Binary response example previews (yml collection)', () => {
  for (const { requestName, folderName, exampleName, previewType, expectedMime } of imagePreviewCases) {
    test(`should preview a saved ${previewType} response (${requestName})`, async ({ pageWithUserData: page }, testInfo) => {
      const savedExampleName = uniqueExampleName(exampleName, testInfo);

      await openCollectionRequest(page, 'bru-collection', folderName, requestName);
      await sendReqAndSaveResposeExample(page, requestName, savedExampleName);

      await test.step('Verify the binary preview renders', async () => {
        const preview = buildCommonLocators(page).responseExample.binaryPreview();
        await expect(preview).toBeVisible();
        await expect(preview).toHaveAttribute('data-preview-type', previewType);
        await expect(preview.locator('img')).toHaveAttribute('src', new RegExp(`^data:${expectedMime};base64,`));
      });
    });
  }
});
