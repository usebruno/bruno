import { test, expect, ElectronApplication } from '../../playwright';
import {
  createCollection,
  createRequest,
  openRequest,
  setAppCode,
  enableApp,
  saveRequest,
  selectRequestBodyMode,
  getAppWebviewHtml
} from '../utils/page';

/*
 * The app runs inside an out-of-process <webview> guest, so we can't reach it
 * through the renderer page. Instead we evaluate in the Electron main process,
 * locate the guest WebContents, and run JS inside it.
 */
const guestEval = (electronApp: ElectronApplication, code: string) =>
  electronApp.evaluate(async ({ webContents }, c) => {
    // The app view loads from a data:text/html URL. Filtering on that keeps us
    // bound to the app guest even if other webviews (e.g. HTML response preview)
    // are present.
    const guest = webContents.getAllWebContents().find((wc) => {
      try {
        return wc.getType() === 'webview' && (wc.getURL() || '').startsWith('data:text/html');
      } catch {
        return false;
      }
    });
    if (!guest) return undefined;
    return await guest.executeJavaScript(c, true);
  }, code);

const waitForGuestReady = async (electronApp: ElectronApplication) => {
  await expect
    .poll(async () => guestEval(electronApp, 'typeof window.ctx'), { timeout: 15000 })
    .toBe('object');
};

const guestResult = (electronApp: ElectronApplication) =>
  guestEval(electronApp, `document.getElementById('out') && document.getElementById('out').getAttribute('data-result')`);

// A fragment app exposing helpers the host-side test can invoke in the guest.
// It echoes the resolved `q` field from the response body into `#out[data-result]`.
const CTX_APP = `
<div id="out" data-result="pending">pending</div>
<script>
  window.__send = function (overrides) {
    document.getElementById('out').setAttribute('data-result', 'sending');
    return ctx.sendRequest(overrides)
      .then(function (res) {
        var d = res && res.data;
        if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) {} }
        var q = (d && d.q) ? d.q : '(none)';
        document.getElementById('out').setAttribute('data-result', String(q));
      })
      .catch(function (e) {
        document.getElementById('out').setAttribute('data-result', 'ERR:' + (e && e.message));
      });
  };
  window.__setVar = function (k, v) { ctx.setRuntimeVariable(k, v); };
  window.__log = function () { ctx.log('hello from app', 42); return 'logged'; };
</script>`;

// POST to the echo endpoint with a templated JSON body so an overridden `q`
// runtime variable round-trips back in the response. (Uses /api/echo/json,
// the same endpoint the rest of the suite relies on.)
const ECHO_JSON_URL = 'http://localhost:8081/api/echo/json';

// Set the JSON request body via the CodeMirror API — typing `{{q}}` would trip
// auto-close-bracket handling.
const setJsonBodyWithVar = async (page) => {
  await selectRequestBodyMode(page, 'JSON');
  const editor = page.getByTestId('request-body-editor').locator('.CodeMirror').first();
  await editor.waitFor({ state: 'visible' });
  await editor.evaluate((el) => {
    const cm = (el as any).CodeMirror;
    if (cm) cm.setValue('{"q":"{{q}}"}');
  });
};

test.describe('Apps - ctx API', () => {
  test('exposes the full ctx surface inside the guest', async ({ page, electronApp, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-ctx-surface');
    await createCollection(page, 'apps-ctx', collectionPath);
    await createRequest(page, 'ctx-req', 'apps-ctx', { url: 'http://localhost:8081/api/echo/anything/x' });
    await openRequest(page, 'apps-ctx', 'ctx-req', { persist: true });

    await setAppCode(page, CTX_APP);
    await enableApp(page);
    await waitForGuestReady(electronApp);

    const raw = await guestEval(
      electronApp,
      `JSON.stringify({
        ctx: typeof window.ctx,
        sendRequest: typeof window.ctx.sendRequest,
        setRuntimeVariable: typeof window.ctx.setRuntimeVariable,
        log: typeof window.ctx.log,
        variablesIsObject: !!(window.ctx.variables && typeof window.ctx.variables === 'object'),
        hooks: ['onThemeChange','onResponseUpdate','onResultsUpdate','onVariablesUpdate'].filter(function (k) { return k in window.ctx; })
      })`
    );
    const surface = JSON.parse(raw as string);

    expect(surface.ctx).toBe('object');
    expect(surface.sendRequest).toBe('function');
    expect(surface.setRuntimeVariable).toBe('function');
    expect(surface.log).toBe('function');
    expect(surface.variablesIsObject).toBe(true);
    expect(surface.hooks).toEqual(['onThemeChange', 'onResponseUpdate', 'onResultsUpdate', 'onVariablesUpdate']);
  });

  test('ctx.theme is applied to the guest document', async ({ page, electronApp, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-ctx-theme');
    await createCollection(page, 'apps-theme', collectionPath);
    await createRequest(page, 'theme-req', 'apps-theme', { url: 'http://localhost:8081/api/echo/anything/x' });
    await openRequest(page, 'apps-theme', 'theme-req', { persist: true });

    await setAppCode(page, CTX_APP);
    await enableApp(page);
    await waitForGuestReady(electronApp);

    const raw = await guestEval(
      electronApp,
      'JSON.stringify({ theme: window.ctx.theme, bodyClass: document.body.className })'
    );
    const { theme, bodyClass } = JSON.parse(raw as string);
    expect(['light', 'dark']).toContain(theme);
    expect(bodyClass).toContain(theme);
  });

  test('ctx.log is callable without throwing', async ({ page, electronApp, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-ctx-log');
    await createCollection(page, 'apps-log', collectionPath);
    await createRequest(page, 'log-req', 'apps-log', { url: 'http://localhost:8081/api/echo/anything/x' });
    await openRequest(page, 'apps-log', 'log-req', { persist: true });

    await setAppCode(page, CTX_APP);
    await enableApp(page);
    await waitForGuestReady(electronApp);

    const result = await guestEval(electronApp, 'window.__log()');
    expect(result).toBe('logged');
  });

  test('ctx.sendRequest sends the request and resolves with the response', async ({ page, electronApp, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-ctx-send');
    await createCollection(page, 'apps-send', collectionPath);
    await createRequest(page, 'send-req', 'apps-send', { method: 'POST', url: ECHO_JSON_URL });
    await openRequest(page, 'apps-send', 'send-req', { persist: true });

    await setJsonBodyWithVar(page);
    await setAppCode(page, CTX_APP);
    await saveRequest(page);
    await enableApp(page);
    await waitForGuestReady(electronApp);

    await test.step('flat override keys become runtime variables', async () => {
      await guestEval(electronApp, `void window.__send({ q: 'reflectme' })`);
      await expect.poll(() => guestResult(electronApp), { timeout: 15000 }).toBe('reflectme');
    });

    await test.step('explicit { variables } override is also honoured', async () => {
      await guestEval(electronApp, `void window.__send({ variables: { q: 'viaExplicit' } })`);
      await expect.poll(() => guestResult(electronApp), { timeout: 15000 }).toBe('viaExplicit');
    });
  });

  test('ctx.setRuntimeVariable persists for subsequent sends', async ({ page, electronApp, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-ctx-setvar');
    await createCollection(page, 'apps-setvar', collectionPath);
    await createRequest(page, 'setvar-req', 'apps-setvar', { method: 'POST', url: ECHO_JSON_URL });
    await openRequest(page, 'apps-setvar', 'setvar-req', { persist: true });

    await setJsonBodyWithVar(page);
    await setAppCode(page, CTX_APP);
    await saveRequest(page);
    await enableApp(page);
    await waitForGuestReady(electronApp);

    await guestEval(electronApp, `window.__setVar('q', 'viaSet')`);
    // Wait for the variable to round-trip back into the guest's ctx.variables
    // (host dispatch → store update → AppView re-render → variables push) rather
    // than guessing with a fixed timeout, then send with no override.
    await expect
      .poll(() => guestEval(electronApp, `window.ctx && window.ctx.variables && window.ctx.variables.q`), { timeout: 15000 })
      .toBe('viaSet');
    await guestEval(electronApp, 'void window.__send()');
    await expect.poll(() => guestResult(electronApp), { timeout: 15000 }).toBe('viaSet');
  });

  test('the ctx bootstrap and user code are injected into the webview source', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-ctx-bootstrap');
    await createCollection(page, 'apps-boot', collectionPath);
    await createRequest(page, 'boot-req', 'apps-boot', { url: 'http://localhost:8081/api/echo/anything/x' });
    await openRequest(page, 'apps-boot', 'boot-req', { persist: true });

    await setAppCode(page, CTX_APP);
    await enableApp(page);

    const html = await getAppWebviewHtml(page);
    // ctx API surface is present in the injected bootstrap
    expect(html).toContain('window.ctx');
    expect(html).toContain('sendRequest');
    expect(html).toContain('setRuntimeVariable');
    expect(html).toContain('__brunoReceive');
    // user code is present
    expect(html).toContain('window.__send');
    expect(html).toContain('window.__log');
  });
});
