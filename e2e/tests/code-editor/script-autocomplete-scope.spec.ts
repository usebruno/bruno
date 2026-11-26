import { test, expect } from '../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  dismissCodeEditorHints,
  focusScriptEditor,
  openCollectionSettings,
  readCodeEditorHints,
  readScriptEditorContent,
  showRootScriptHints,
  typeInScriptEditor
} from '../../pages';

const COLLECTION = 'script-autocomplete-scope';
const REQUEST = 'ScopedHints';
const OTHER_EDITORS_COLLECTION = 'script-autocomplete-other-editors';
const GRPC_REQUEST = 'GrpcHints';
const COLLECTION_TESTS_COLLECTION = 'script-autocomplete-collection-tests';

test.describe.serial('Script autocomplete scope', () => {
  test.beforeAll(async ({ page, createTmpDir }) => {
    const tmpDir = await createTmpDir('script-autocomplete-scope');
    await createCollection(page, COLLECTION, tmpDir);
    await createRequest(page, REQUEST, COLLECTION);
  });

  test.afterEach(async ({ page }) => {
    await dismissCodeEditorHints(page);
  });

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('pre-request offers bru and req as roots, never res', async ({ page }) => {
    await test.step('Request root hints in the pre-request editor', async () => {
      await showRootScriptHints(page, 'pre-request');
    });

    await test.step('Only the pre-request globals are listed', async () => {
      expect(await readCodeEditorHints(page)).toEqual(['bru', 'req']);
    });
  });

  test('post-response offers bru, req and res as roots', async ({ page }) => {
    await test.step('Request root hints in the post-response editor', async () => {
      await showRootScriptHints(page, 'post-response');
    });

    await test.step('Every global the phase binds is listed', async () => {
      expect(await readCodeEditorHints(page)).toEqual(['bru', 'req', 'res']);
    });
  });

  test('pre-request suggests no members for res', async ({ page }) => {
    const hints = buildCommonLocators(page).codeEditorHints;

    await test.step('Type a res member access in the pre-request editor', async () => {
      await focusScriptEditor(page, 'pre-request');
      await typeInScriptEditor(page, 'pre-request', 'res.');
    });

    await test.step('The keystrokes landed in the editor', async () => {
      expect(await readScriptEditorContent(page, 'pre-request')).toBe('res.');
    });

    await test.step('No hint popup opens', async () => {
      await expect(hints.popup()).toBeHidden();
    });
  });

  test('pre-request still suggests members for req', async ({ page }) => {
    await test.step('Type a req member access in the pre-request editor', async () => {
      await focusScriptEditor(page, 'pre-request');
      await typeInScriptEditor(page, 'pre-request', 'req.');
    });

    await test.step('Request members are offered', async () => {
      expect(await readCodeEditorHints(page)).toContain('getUrl()');
    });
  });

  test('post-response still suggests members for req', async ({ page }) => {
    await test.step('Type a req member access in the post-response editor', async () => {
      await focusScriptEditor(page, 'post-response');
      await typeInScriptEditor(page, 'post-response', 'req.');
    });

    await test.step('Request members are offered', async () => {
      expect(await readCodeEditorHints(page)).toContain('getUrl()');
    });
  });

  test('post-response still suggests members for res', async ({ page }) => {
    await test.step('Type a res member access in the post-response editor', async () => {
      await focusScriptEditor(page, 'post-response');
      await typeInScriptEditor(page, 'post-response', 'res.');
    });

    await test.step('Response members are offered', async () => {
      expect(await readCodeEditorHints(page)).toContain('getBody()');
    });
  });

  test('bru stays available in both script phases', async ({ page }) => {
    await test.step('Pre-request offers bru members', async () => {
      await focusScriptEditor(page, 'pre-request');
      await typeInScriptEditor(page, 'pre-request', 'bru.');
      expect(await readCodeEditorHints(page)).toContain('getEnvVar(key)');
      await dismissCodeEditorHints(page);
    });

    await test.step('Post-response offers bru members', async () => {
      await focusScriptEditor(page, 'post-response');
      await typeInScriptEditor(page, 'post-response', 'bru.');
      expect(await readCodeEditorHints(page)).toContain('setEnvVar(key, value)');
    });
  });
});

test.describe.serial('Script autocomplete in gRPC editors', () => {
  test.beforeAll(async ({ page, createTmpDir }) => {
    const tmpDir = await createTmpDir('script-autocomplete-other-editors');
    await createCollection(page, OTHER_EDITORS_COLLECTION, tmpDir);
    await createRequest(page, GRPC_REQUEST, OTHER_EDITORS_COLLECTION, { url: 'localhost:50051', requestType: 'grpc' });
  });

  test.afterEach(async ({ page }) => {
    await dismissCodeEditorHints(page);
  });

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('gRPC Before Call Start offers only bru as a root', async ({ page }) => {
    await test.step('Request root hints in the Before Call Start editor', async () => {
      await showRootScriptHints(page, 'before-call-start');
    });

    await test.step('Only bru is listed', async () => {
      expect(await readCodeEditorHints(page)).toEqual(['bru']);
    });
  });

  test('gRPC Before Call Start suggests the gRPC members of bru', async ({ page }) => {
    await test.step('Type a bru member access in the Before Call Start editor', async () => {
      await focusScriptEditor(page, 'before-call-start');
      await typeInScriptEditor(page, 'before-call-start', 'bru.');
    });

    await test.step('The gRPC namespace is offered', async () => {
      expect(await readCodeEditorHints(page)).toContain('grpc');
    });
  });
});

test.describe.serial('Script autocomplete in collection Tests', () => {
  test.beforeAll(async ({ page, createTmpDir }) => {
    const tmpDir = await createTmpDir('script-autocomplete-collection-tests');
    await createCollection(page, COLLECTION_TESTS_COLLECTION, tmpDir);
    await openCollectionSettings(page, COLLECTION_TESTS_COLLECTION);
  });

  test.afterEach(async ({ page }) => {
    await dismissCodeEditorHints(page);
  });

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('collection Tests offers bru, req and res as roots', async ({ page }) => {
    await test.step('Request root hints in the collection Tests editor', async () => {
      await showRootScriptHints(page, 'collection-tests');
    });

    await test.step('Every global the tests bind is listed', async () => {
      expect(await readCodeEditorHints(page)).toEqual(['bru', 'req', 'res']);
    });
  });

  test('collection Tests suggests members for res', async ({ page }) => {
    await test.step('Type a res member access in the collection Tests editor', async () => {
      await focusScriptEditor(page, 'collection-tests');
      await typeInScriptEditor(page, 'collection-tests', 'res.');
    });

    await test.step('Response members are offered', async () => {
      expect(await readCodeEditorHints(page)).toContain('getBody()');
    });
  });
});
