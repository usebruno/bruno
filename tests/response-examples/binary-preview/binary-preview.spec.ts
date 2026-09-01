import * as fs from 'fs';
import * as path from 'path';
import jsyaml from 'js-yaml';
import { closeElectronApp, ElectronApplication, expect, test, waitForReadyPage } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import { editCodeMirrorEditor, expandCollection, openRequest, openRequestInFolder } from '../../utils/page/actions';
import { sendRequestAndSaveResponseExample } from '../../utils/page/response-example';

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

const initUserDataPath = path.join(__dirname, 'init-user-data');
const fixtureCollectionPath = path.join(__dirname, 'fixtures', 'collection');

type LaunchFixtures = {
  launchElectronApp: (options?: { initUserDataPath?: string; templateVars?: Record<string, string> }) => Promise<ElectronApplication>;
  createTmpDir: (tag?: string) => Promise<string>;
};

const launchWithIsolatedCollection = async ({ launchElectronApp, createTmpDir }: LaunchFixtures) => {
  const collectionPath = await createTmpDir('binary-preview-collection');
  await fs.promises.cp(fixtureCollectionPath, collectionPath, { recursive: true });
  const app = await launchElectronApp({ initUserDataPath, templateVars: { collectionPath } });
  const page = await waitForReadyPage(app);
  return { app, page, collectionPath };
};

// Reads the body the app persisted for a saved example straight from the request's .yml file.
const readSavedExampleBody = (requestFilePath: string, exampleName: string) => {
  const doc = jsyaml.load(fs.readFileSync(requestFilePath, 'utf8')) as any;
  return doc.examples?.find((example: any) => example.name === exampleName)?.response?.body;
};

test.describe('Binary response example previews', () => {
  test.describe.configure({ timeout: 60_000 });

  for (const { requestName, folderName, exampleName, previewType, expectedMime } of binaryPreviewCases) {
    test(`should preview a saved ${previewType} response (${requestName})`, async ({ launchElectronApp, createTmpDir }) => {
      const { app, page } = await launchWithIsolatedCollection({ launchElectronApp, createTmpDir });

      if (folderName) {
        await expandCollection(page, 'binary-preview');
        await openRequestInFolder(page, folderName, requestName);
      } else {
        await openRequest(page, 'binary-preview', requestName);
      }
      await sendRequestAndSaveResponseExample(page, requestName, exampleName);

      await test.step('Verify the binary preview renders', async () => {
        const { responseExample } = buildCommonLocators(page);
        await expect(responseExample.binaryPreview()).toBeVisible();
        await expect(responseExample.binaryPreview()).toHaveAttribute('data-preview-type', previewType);

        if (previewType === 'image') {
          await expect(responseExample.binaryPreviewImage()).toHaveAttribute('src', new RegExp(`^data:${expectedMime};base64,`));
        } else if (previewType === 'pdf') {
          await expect(responseExample.binaryPreviewPdfCanvas()).toBeVisible();
        } else if (previewType === 'audio') {
          await expect(responseExample.binaryPreviewAudio()).toHaveAttribute('src', new RegExp(`^data:${expectedMime};base64,`));
        } else if (previewType === 'video') {
          // VideoPreview serves the bytes through a blob URL, not a data URI
          await expect(responseExample.binaryPreviewVideo()).toHaveAttribute('src', /^blob:/);
        }
      });

      await closeElectronApp(app);
    });
  }

  test('should sniff the real content type when the header is mislabeled (binary-preview-mislabeled)', async ({ launchElectronApp, createTmpDir }) => {
    const { app, page } = await launchWithIsolatedCollection({ launchElectronApp, createTmpDir });

    await openRequest(page, 'binary-preview', 'binary-preview-mislabeled');
    await sendRequestAndSaveResponseExample(page, 'binary-preview-mislabeled', 'Mislabeled Example');

    await test.step('Verify the sniffed image preview renders', async () => {
      const { responseExample } = buildCommonLocators(page);
      await expect(responseExample.binaryPreview()).toBeVisible();
      await expect(responseExample.binaryPreview()).toHaveAttribute('data-preview-type', 'image');
      await expect(responseExample.binaryPreviewImage()).toHaveAttribute('src', /^data:image\/png;base64,/);
    });

    await closeElectronApp(app);
  });

  test('should keep the binary preview when the Content-Type header is edited (binary-preview-image-png)', async ({ launchElectronApp, createTmpDir }) => {
    const { app, page } = await launchWithIsolatedCollection({ launchElectronApp, createTmpDir });

    const { responseExample } = buildCommonLocators(page);

    await expandCollection(page, 'binary-preview');
    await openRequestInFolder(page, 'images', 'binary-preview-image-png');
    await sendRequestAndSaveResponseExample(page, 'binary-preview-image-png', 'PNG Example');
    await expect(responseExample.binaryPreview()).toHaveAttribute('data-preview-type', 'image');

    await test.step('Change the Content-Type header to application/json in edit mode', async () => {
      await responseExample.editButton().click();
      await responseExample.responsePaneTab('headers').click();

      const contentTypeRow = responseExample.headerRow('content-type');
      await expect(contentTypeRow).toHaveCount(1);

      const valueEditor = responseExample.headerRowValueEditor(contentTypeRow);
      await valueEditor.click();
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
      await page.keyboard.type('application/json');
      await expect(valueEditor).toContainText('application/json');
    });

    await test.step('Verify the image preview still renders', async () => {
      await responseExample.responsePaneTab('response').click();
      await expect(responseExample.binaryPreview()).toBeVisible();
      await expect(responseExample.binaryPreview()).toHaveAttribute('data-preview-type', 'image');
      await expect(responseExample.binaryPreviewImage()).toHaveAttribute('src', /^data:image\/png;base64,/);
    });

    await test.step('Verify the preview survives saving the example', async () => {
      await responseExample.saveButton().click();
      await expect(responseExample.editButton()).toBeVisible();
      await expect(responseExample.binaryPreview()).toHaveAttribute('data-preview-type', 'image');
    });

    await closeElectronApp(app);
  });

  test('should keep showing the preview instead of a raw editor in edit mode (binary-preview-image-png)', async ({ launchElectronApp, createTmpDir }) => {
    const { app, page } = await launchWithIsolatedCollection({ launchElectronApp, createTmpDir });

    const { responseExample } = buildCommonLocators(page);

    await expandCollection(page, 'binary-preview');
    await openRequestInFolder(page, 'images', 'binary-preview-image-png');
    await sendRequestAndSaveResponseExample(page, 'binary-preview-image-png', 'PNG Example');
    await expect(responseExample.binaryPreview()).toHaveAttribute('data-preview-type', 'image');

    await test.step('Verify edit mode keeps the preview and does not show the code editor', async () => {
      await responseExample.editButton().click();
      await expect(responseExample.saveButton()).toBeVisible();
      await expect(responseExample.binaryPreview()).toBeVisible();
      await expect(responseExample.binaryPreview()).toHaveAttribute('data-preview-type', 'image');
      await expect(responseExample.responseContent()).toHaveCount(0);
    });

    await test.step('Verify the preview remains after leaving edit mode', async () => {
      await responseExample.saveButton().click();
      await expect(responseExample.editButton()).toBeVisible();
      await expect(responseExample.binaryPreview()).toHaveAttribute('data-preview-type', 'image');
      await expect(responseExample.responseContent()).toHaveCount(0);
    });

    await closeElectronApp(app);
  });

  test('should persist binary examples as base64 and json examples as formatted text', async ({ launchElectronApp, createTmpDir }) => {
    const { app, page, collectionPath } = await launchWithIsolatedCollection({ launchElectronApp, createTmpDir });

    await test.step('Save a PNG example and verify the stored body is the raw base64', async () => {
      await expandCollection(page, 'binary-preview');
      await openRequestInFolder(page, 'images', 'binary-preview-image-png');
      await sendRequestAndSaveResponseExample(page, 'binary-preview-image-png', 'PNG Example');

      await expect(async () => {
        const body = readSavedExampleBody(path.join(collectionPath, 'images', 'binary-preview-image-png.yml'), 'PNG Example');
        expect(body?.type).toBe('binary');
        expect(body?.data).toMatch(/^iVBORw0KGgo[A-Za-z0-9+/=]+$/);
      }).toPass({ timeout: 10_000 });
    });

    await test.step('Save a JSON example and verify the stored body is formatted json', async () => {
      await openRequest(page, 'binary-preview', 'binary-preview-json');
      await sendRequestAndSaveResponseExample(page, 'binary-preview-json', 'JSON Example');

      await expect(async () => {
        const body = readSavedExampleBody(path.join(collectionPath, 'binary-preview-json.yml'), 'JSON Example');
        expect(body?.type).toBe('json');
        expect(body?.data).toBe('{\n  "hello": "world"\n}');
      }).toPass({ timeout: 10_000 });
    });

    await closeElectronApp(app);
  });

  test('should show SVG as editable markup rather than a binary preview (binary-preview-svg)', async ({ launchElectronApp, createTmpDir }) => {
    const { app, page, collectionPath } = await launchWithIsolatedCollection({ launchElectronApp, createTmpDir });

    const { responseExample } = buildCommonLocators(page);

    await openRequest(page, 'binary-preview', 'binary-preview-svg');
    await sendRequestAndSaveResponseExample(page, 'binary-preview-svg', 'SVG Example');

    // image/svg+xml is XML text, so it is stored and edited as markup, not media.
    await test.step('Verify the markup renders in the editor instead of an image preview', async () => {
      await expect(responseExample.binaryPreview()).toHaveCount(0);
      await expect(responseExample.responseContentCodeMirror()).toContainText('<svg');
      await expect(responseExample.responseContentCodeMirror()).toContainText('Test SVG');
    });

    await test.step('Verify the stored body is text, not binary', async () => {
      await expect(async () => {
        const body = readSavedExampleBody(path.join(collectionPath, 'binary-preview-svg.yml'), 'SVG Example');
        expect(body?.type).toBe('text');
        expect(body?.data).toContain('<svg');
      }).toPass({ timeout: 10_000 });
    });

    await closeElectronApp(app);
  });

  test('should show the raw body when the bytes are not previewable (binary-preview-unknown-binary)', async ({ launchElectronApp, createTmpDir }) => {
    const { app, page } = await launchWithIsolatedCollection({ launchElectronApp, createTmpDir });

    const locators = buildCommonLocators(page);

    await openRequest(page, 'binary-preview', 'binary-preview-unknown-binary');
    await sendRequestAndSaveResponseExample(page, 'binary-preview-unknown-binary', 'Unknown Binary Example');

    // application/octet-stream bytes with no recognizable signature have no
    // visual preview — the raw base64 body renders in the editor instead.
    await test.step('Verify the raw body renders instead of a binary preview', async () => {
      await expect(locators.responseExample.title()).toBeVisible();
      await expect(locators.responseExample.binaryPreview()).toHaveCount(0);
      await expect(locators.responseExample.responseContentCodeMirror()).toContainText('AAECAwQFBgcI');
    });

    await test.step('Verify the raw body is editable in edit mode', async () => {
      await locators.responseExample.editButton().click();
      await editCodeMirrorEditor(page, 'response-example-response-content', 'ZWRpdGVk');
      await expect(locators.responseExample.responseContentCodeMirror()).toContainText('ZWRpdGVk');
      await expect(locators.responseExample.responseContentCodeMirror()).not.toContainText('AAECAwQFBgcI');
    });

    await closeElectronApp(app);
  });
});
