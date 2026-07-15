import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection, selectRequestPaneTab } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import { createRequestFromCurl } from '../../utils/page/request';

const COLLECTION_NAME = 'curl-data-binary';

const INLINE_JSON_CURL = 'curl -H "Content-Type: application/json" --data-binary "{\\"name\\":\\"bruno\\"}" "https://httpbin.org/post"';

// The `@` prefix tells curl to read the body from a file — a genuine file body.
const FILE_CURL = 'curl -H "Content-Type: application/octet-stream" --data-binary "@/path/to/bruno.json" "https://httpbin.org/post"';

test.describe('cURL import — --data-binary', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('inline --data-binary JSON imports as a JSON body instead of crashing', async ({ page, createTmpDir }) => {
    const { request } = buildCommonLocators(page);
    await createCollection(page, COLLECTION_NAME, await createTmpDir(COLLECTION_NAME));

    await createRequestFromCurl(page, 'data-binary-json', INLINE_JSON_CURL, COLLECTION_NAME);

    await test.step('Body imported as JSON with the inline payload', async () => {
      await selectRequestPaneTab(page, 'Body');
      await expect(request.bodyModeSelector()).toContainText('JSON');

      const bodyText = (await request.bodyEditor().locator('.CodeMirror').textContent()) ?? '';
      expect(bodyText.replace(/\s/g, '')).toContain('"name":"bruno"');
    });
  });

  test('--data-binary @file still imports as a File / Binary body', async ({ page, createTmpDir }) => {
    const { request } = buildCommonLocators(page);
    await createCollection(page, COLLECTION_NAME, await createTmpDir(COLLECTION_NAME));

    await createRequestFromCurl(page, 'data-binary-file', FILE_CURL, COLLECTION_NAME);

    await test.step('Body imported as File / Binary with the file reference', async () => {
      await selectRequestPaneTab(page, 'Body');
      await expect(request.bodyModeSelector()).toContainText('File');

      // File name is shown by basename.
      await expect(request.fileBodyTable()).toBeVisible();
      await expect(request.fileBodyName()).toContainText('bruno.json');
    });
  });
});
