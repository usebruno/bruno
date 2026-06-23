import { test, expect, ElectronApplication } from '../../playwright';
import {
  createCollection,
  createRequest,
  createApp,
  selectAppView,
  selectRequestBodyMode,
  saveRequest
} from '../utils/page';

/*
 * The collection app's preview runs inside an out-of-process <webview> guest,
 * so we evaluate in the Electron main process, locate the app webview, and
 * execute JS inside it (mirrors apps-ctx-api.spec.ts).
 */
const guestEval = (
  electronApp: ElectronApplication,
  code: string,
  expectedCollectionName?: string
) =>
  electronApp.evaluate(
    async ({ webContents }, params) => {
      const guests = webContents.getAllWebContents().filter((wc) => {
        try {
          return wc.getType() === 'webview' && (wc.getURL() || '').startsWith('data:text/html');
        } catch {
          return false;
        }
      });
      if (!params.expectedCollectionName) {
        for (const guest of guests) {
          try {
            return await guest.executeJavaScript(params.code, true);
          } catch {
            /* try the next one */
          }
        }
        return undefined;
      }
      for (const guest of guests) {
        try {
          const name = await guest.executeJavaScript(
            'window.ctx && window.ctx.collection && window.ctx.collection.name',
            true
          );
          if (name === params.expectedCollectionName) {
            return await guest.executeJavaScript(params.code, true);
          }
        } catch {
        }
      }
      return undefined;
    },
    { code, expectedCollectionName }
  );

const waitForGuestReady = async (electronApp: ElectronApplication, collectionName?: string) => {
  await expect
    .poll(async () => guestEval(electronApp, 'typeof window.ctx', collectionName), { timeout: 15000 })
    .toBe('object');
};

// Set the CodeMirror editor in the active CollectionApp tab. We use the API
// directly to avoid auto-close-bracket corruption when typing HTML/JS.
const setCollectionAppCode = async (page, code: string) => {
  await selectAppView(page, 'code');
  const editor = page.getByTestId('collection-app-code').locator('.CodeMirror').first();
  await editor.waitFor({ state: 'visible' });
  await editor.evaluate((el, val) => {
    const cm = (el as any).CodeMirror;
    if (cm) cm.setValue(val);
  }, code);
};

// A minimal app that exposes helpers the test can drive from the host side.
// Writes its results into a single data-attribute we then poll.
const CTX_APP = `
<div id="out" data-result="pending">pending</div>
<script>
  window.__listRequests = async function () {
    const r = await ctx.listRequests();
    document.getElementById('out').setAttribute('data-result', JSON.stringify(r.map(x => x.name)));
  };
  window.__runEcho = async function (pathname) {
    try {
      const res = await ctx.runRequest(pathname, { q: 'echoed' });
      const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      document.getElementById('out').setAttribute('data-result', JSON.stringify({ status: res.status, q: data && data.q }));
    } catch (e) {
      document.getElementById('out').setAttribute('data-result', 'ERR:' + e.message);
    }
  };
  window.__readVar = function (key) {
    document.getElementById('out').setAttribute('data-result', String(ctx.variables[key] ?? '(missing)'));
  };
  window.__readCollectionName = function () {
    document.getElementById('out').setAttribute('data-result', String(ctx.collection && ctx.collection.name));
  };
</script>`;

const ECHO_JSON_URL = 'http://localhost:8081/api/echo/json';

test.describe('Collection apps', () => {
  test('Create from collection menu → appears in sidebar → opens as own tab with Code/Preview', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('collection-apps-create');
    await createCollection(page, 'col-apps-create', collectionPath);

    await createApp(page, 'My App', { collectionName: 'col-apps-create' });

    await test.step('Sidebar item with app icon appears', async () => {
      await expect(page.locator('.collection-item-name').filter({ hasText: 'My App' })).toBeVisible();
    });

    await test.step('Tab opens, Code/Preview toggle works', async () => {
      await expect(page.getByTestId('collection-app')).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId('collection-app-view-preview')).toHaveClass(/active/);
      await selectAppView(page, 'code');
      await expect(page.getByTestId('collection-app-code')).toBeVisible();
      await expect(page.getByTestId('collection-app-view-code')).toHaveClass(/active/);
      await selectAppView(page, 'preview');
      await expect(page.getByTestId('collection-app-preview').locator('webview')).toBeVisible();
    });
  });

  test('ctx.listRequests sees every request in the collection', async ({ page, electronApp, createTmpDir }) => {
    const collectionPath = await createTmpDir('collection-apps-list');
    await createCollection(page, 'col-apps-list', collectionPath);
    await createRequest(page, 'alpha', 'col-apps-list', { url: 'http://localhost:8081/ping' });
    await createRequest(page, 'beta', 'col-apps-list', { url: 'http://localhost:8081/ping' });

    await createApp(page, 'List App', { collectionName: 'col-apps-list' });
    await setCollectionAppCode(page, CTX_APP);
    await saveRequest(page);

    await selectAppView(page, 'preview');
    await waitForGuestReady(electronApp, 'col-apps-list');

    await guestEval(electronApp, 'void window.__listRequests()', 'col-apps-list');
    await expect
      .poll(() => guestEval(electronApp, `document.getElementById('out') && document.getElementById('out').getAttribute('data-result')`, 'col-apps-list'), { timeout: 15000 })
      .toBe(JSON.stringify(['alpha', 'beta']));
  });

  test('ctx.runRequest executes a request by pathname and reflects the response', async ({ page, electronApp, createTmpDir }) => {
    const collectionPath = await createTmpDir('collection-apps-run');
    await createCollection(page, 'col-apps-run', collectionPath);
    await createRequest(page, 'echo', 'col-apps-run', { method: 'POST', url: ECHO_JSON_URL });

    // Body referencing {{q}} so the override turns into the response payload.
    await page.locator('.collection-item-name').filter({ hasText: 'echo' }).click();
    await selectRequestBodyMode(page, 'JSON');
    const bodyEditor = page.getByTestId('request-body-editor').locator('.CodeMirror').first();
    await bodyEditor.waitFor({ state: 'visible' });
    await bodyEditor.evaluate((el) => {
      const cm = (el as any).CodeMirror;
      if (cm) cm.setValue('{"q":"{{q}}"}');
    });
    await saveRequest(page);

    await createApp(page, 'Runner App', { collectionName: 'col-apps-run' });
    await setCollectionAppCode(page, CTX_APP);
    await saveRequest(page);

    await selectAppView(page, 'preview');
    await waitForGuestReady(electronApp, 'col-apps-run');

    // Resolve the pathname of the 'echo' request via ctx.listRequests, then run it.
    await guestEval(
      electronApp,
      `(async () => {
        const requests = await ctx.listRequests();
        const echo = requests.find(r => r.name === 'echo');
        await window.__runEcho(echo.pathname);
      })()`,
      'col-apps-run'
    );

    await expect
      .poll(() => guestEval(electronApp, `document.getElementById('out') && document.getElementById('out').getAttribute('data-result')`, 'col-apps-run'), { timeout: 20000 })
      .toBe(JSON.stringify({ status: 200, q: 'echoed' }));
  });

  test('ctx.setRuntimeVariable persists into ctx.variables', async ({ page, electronApp, createTmpDir }) => {
    const collectionPath = await createTmpDir('collection-apps-vars');
    await createCollection(page, 'col-apps-vars', collectionPath);

    await createApp(page, 'Vars App', { collectionName: 'col-apps-vars' });
    await setCollectionAppCode(page, CTX_APP);
    await saveRequest(page);

    await selectAppView(page, 'preview');
    await waitForGuestReady(electronApp, 'col-apps-vars');

    await guestEval(electronApp, `ctx.setRuntimeVariable('hello', 'world')`, 'col-apps-vars');
    await expect
      .poll(() => guestEval(electronApp, `ctx.variables && ctx.variables.hello`, 'col-apps-vars'), { timeout: 15000 })
      .toBe('world');
  });

  test('ctx.collection exposes the active collection', async ({ page, electronApp, createTmpDir }) => {
    const collectionPath = await createTmpDir('collection-apps-meta');
    await createCollection(page, 'col-apps-meta', collectionPath);

    await createApp(page, 'Meta App', { collectionName: 'col-apps-meta' });
    await setCollectionAppCode(page, CTX_APP);
    await saveRequest(page);

    await selectAppView(page, 'preview');
    await waitForGuestReady(electronApp, 'col-apps-meta');

    await guestEval(electronApp, 'void window.__readCollectionName()', 'col-apps-meta');
    await expect
      .poll(() => guestEval(electronApp, `document.getElementById('out') && document.getElementById('out').getAttribute('data-result')`, 'col-apps-meta'), { timeout: 15000 })
      .toBe('col-apps-meta');
  });
});
