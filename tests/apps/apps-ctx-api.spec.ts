import { test, expect, ElectronApplication } from '../../playwright';
import {
  createCollection,
  createRequest,
  openRequest,
  setAppCode,
  previewApp,
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
    // The app view loads from a data:text/html URL. Filtering on that and
    // selecting the newest keeps us bound to the app guest even if other
    // webviews (e.g. HTML response preview) are present.
    const guests = webContents.getAllWebContents().filter((wc) => {
      try {
        return wc.getType() === 'webview' && (wc.getURL() || '').startsWith('data:text/html');
      } catch {
        return false;
      }
    });
    if (!guests.length) return undefined;
    const guest = guests.reduce((newest, wc) => (wc.id > newest.id ? wc : newest));
    return await guest.executeJavaScript(c, true);
  }, code);

const waitForGuestReady = async (electronApp: ElectronApplication) => {
  await expect
    .poll(async () => guestEval(electronApp, 'window.bru && typeof window.bru.ctx'), { timeout: 15000 })
    .toBe('object');
};

const guestResult = (electronApp: ElectronApplication) =>
  guestEval(electronApp, `document.getElementById('out') && document.getElementById('out').getAttribute('data-result')`);

// A fragment app exposing helpers the host-side test can invoke in the guest.
// It echoes the resolved `q` field from the response body into `#out[data-result]`.
const CTX_APP = `
<div id="out" data-result="pending">pending</div>
<script>
  window.__send = function (options) {
    document.getElementById('out').setAttribute('data-result', 'sending');
    return bru.ctx.submitRequest(options)
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
  window.__setVar = function (k, v) { bru.ctx.variables.runtime.set(k, v); };
  window.__log = function () { bru.ctx.log('hello from app', 42); return 'logged'; };
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
    await previewApp(page);
    await waitForGuestReady(electronApp);

    const raw = await guestEval(
      electronApp,
      `JSON.stringify({
        ctx: typeof window.bru.ctx,
        submitRequest: typeof window.bru.ctx.submitRequest,
        runtimeSet: typeof window.bru.ctx.variables.runtime.set,
        log: typeof window.bru.ctx.log,
        resolvedVariablesIsObject: !!(window.bru.ctx.variables.resolved && typeof window.bru.ctx.variables.resolved === 'object'),
        hooks: ['onThemeChange','onAssertionsChange','onTestsChange','onVariablesChange'].filter(function (k) { return k in window.bru.ctx; }),
        httpHook: typeof window.bru.ctx.http.onResponseChange
      })`
    );
    const surface = JSON.parse(raw as string);

    expect(surface.ctx).toBe('object');
    expect(surface.submitRequest).toBe('function');
    expect(surface.runtimeSet).toBe('function');
    expect(surface.log).toBe('function');
    expect(surface.resolvedVariablesIsObject).toBe(true);
    expect(surface.hooks).toEqual(['onThemeChange', 'onAssertionsChange', 'onTestsChange', 'onVariablesChange']);
    expect(surface.httpHook).toBe('object');
  });

  test('bru.ctx.theme is applied to the guest document', async ({ page, electronApp, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-ctx-theme');
    await createCollection(page, 'apps-theme', collectionPath);
    await createRequest(page, 'theme-req', 'apps-theme', { url: 'http://localhost:8081/api/echo/anything/x' });
    await openRequest(page, 'apps-theme', 'theme-req', { persist: true });

    await setAppCode(page, CTX_APP);
    await previewApp(page);
    await waitForGuestReady(electronApp);

    const raw = await guestEval(
      electronApp,
      `JSON.stringify({
        name: window.bru.ctx.theme.name,
        mode: window.bru.ctx.theme.mode,
        hasConfig: !!(window.bru.ctx.theme.config && typeof window.bru.ctx.theme.config === 'object'),
        bodyClass: document.body.className
      })`
    );
    const { name, mode, hasConfig, bodyClass } = JSON.parse(raw as string);
    expect(typeof name).toBe('string');
    expect(['light', 'dark']).toContain(mode);
    expect(hasConfig).toBe(true);
    expect(bodyClass).toContain(mode);
  });

  test('bru.ctx.log is callable without throwing', async ({ page, electronApp, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-ctx-log');
    await createCollection(page, 'apps-log', collectionPath);
    await createRequest(page, 'log-req', 'apps-log', { url: 'http://localhost:8081/api/echo/anything/x' });
    await openRequest(page, 'apps-log', 'log-req', { persist: true });

    await setAppCode(page, CTX_APP);
    await previewApp(page);
    await waitForGuestReady(electronApp);

    const result = await guestEval(electronApp, 'window.__log()');
    expect(result).toBe('logged');
  });

  test('bru.ctx.submitRequest sends the request and resolves with the response', async ({ page, electronApp, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-ctx-send');
    await createCollection(page, 'apps-send', collectionPath);
    await createRequest(page, 'send-req', 'apps-send', { method: 'POST', url: ECHO_JSON_URL });
    await openRequest(page, 'apps-send', 'send-req', { persist: true });

    await setJsonBodyWithVar(page);
    await setAppCode(page, CTX_APP);
    await saveRequest(page);
    await previewApp(page);
    await waitForGuestReady(electronApp);

    await test.step('runtimeVariables override the request body', async () => {
      await guestEval(electronApp, `void window.__send({ runtimeVariables: { q: 'reflectme' } })`);
      await expect.poll(() => guestResult(electronApp), { timeout: 15000 }).toBe('reflectme');
    });

    await test.step('a subsequent runtimeVariables override is honoured', async () => {
      await guestEval(electronApp, `void window.__send({ runtimeVariables: { q: 'viaExplicit' } })`);
      await expect.poll(() => guestResult(electronApp), { timeout: 15000 }).toBe('viaExplicit');
    });
  });

  test('bru.ctx.variables.runtime.set persists for subsequent sends', async ({ page, electronApp, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-ctx-setvar');
    await createCollection(page, 'apps-setvar', collectionPath);
    await createRequest(page, 'setvar-req', 'apps-setvar', { method: 'POST', url: ECHO_JSON_URL });
    await openRequest(page, 'apps-setvar', 'setvar-req', { persist: true });

    await setJsonBodyWithVar(page);
    await setAppCode(page, CTX_APP);
    await saveRequest(page);
    await previewApp(page);
    await waitForGuestReady(electronApp);

    await guestEval(electronApp, `window.__setVar('q', 'viaSet')`);
    // Wait for the variable to round-trip back into the guest's bru.ctx.variables.resolved
    // (host dispatch → store update → AppView re-render → variables push) rather
    // than guessing with a fixed timeout, then send with no override.
    await expect
      .poll(() => guestEval(electronApp, `window.bru && window.bru.ctx.variables.resolved && window.bru.ctx.variables.resolved.q`), { timeout: 15000 })
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
    await previewApp(page);

    const html = await getAppWebviewHtml(page);
    // ctx API surface is present in the injected bootstrap
    expect(html).toContain('window.bru');
    expect(html).toContain('submitRequest');
    expect(html).toContain('__brunoReceive');
    // user code is present
    expect(html).toContain('window.__send');
    expect(html).toContain('window.__log');
  });
});
