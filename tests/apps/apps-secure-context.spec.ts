import { test, expect } from '../../playwright';
import {
  createCollection,
  createRequest,
  openRequest,
  setAppCode,
  previewApp,
  evalInActiveAppGuest as guestEval,
  waitForAppGuestReady
} from '../utils/page';

/*
 * App guests must run in a secure context.
 *
 * Inlining a guest as `data:text/html` gives it an opaque origin, which is not
 * a secure context: `crypto.subtle` is absent, and third-party SDKs that
 * require one refuse to initialise. Guests are served over the privileged
 * `bruno-app://` scheme instead, with a per-app token in the host so each guest
 * keeps its own origin.
 */

const openAppWith = async (page, electronApp, createTmpDir, name: string, appCode: string) => {
  const collectionPath = await createTmpDir(`apps-secure-${name}`);
  await createCollection(page, `secure-${name}`, collectionPath);
  await createRequest(page, `req-${name}`, `secure-${name}`, { url: 'http://localhost:8081/api/echo/anything/x' });
  await openRequest(page, `secure-${name}`, `req-${name}`, { persist: true });
  await setAppCode(page, appCode);
  await previewApp(page);
  await waitForAppGuestReady(page, electronApp, { timeout: 20000 });
};

// Publishes into #out[data-result] so the host can poll for a settled value.
const REPORT_APP = `
<div id="out" data-result="pending"></div>
<script>
  (async function () {
    var result = {
      origin: String(window.origin),
      protocol: location.protocol,
      isSecureContext: window.isSecureContext,
      hasSubtleCrypto: !!(window.crypto && window.crypto.subtle),
      digest: null,
      digestError: null
    };
    // Exercising subtle crypto proves the secure context is real rather than
    // just reported: the API is present but unusable on an opaque origin.
    try {
      var hash = await crypto.subtle.digest('SHA-256', new Uint8Array([1, 2, 3]));
      result.digest = new Uint8Array(hash).length;
    } catch (e) {
      result.digestError = String(e && e.message);
    }
    document.getElementById('out').setAttribute('data-result', JSON.stringify(result));
  })();
</script>`;

const awaitResult = async (page, electronApp, timeoutMs: number) => {
  let parsed = null;
  await expect
    .poll(
      async () => {
        const raw = await guestEval(
          page,
          electronApp,
          `document.getElementById('out') && document.getElementById('out').getAttribute('data-result')`
        );
        if (typeof raw !== 'string' || raw === 'pending') return false;
        parsed = JSON.parse(raw);
        return true;
      },
      { timeout: timeoutMs }
    )
    .toBe(true);
  return parsed;
};

// The values every guest must report; a shared origin or a data: fallback
// fails here regardless of which test surfaced the guest.
const expectSecureGuest = (result) => {
  expect(result.protocol, 'guest must not fall back to a data: URL').toBe('bruno-app:');
  // A per-app token in the host keeps each guest on its own origin; a shared
  // origin would let apps reach each other's storage.
  expect(result.origin).toMatch(/^bruno-app:\/\/[0-9a-f-]{36}$/);
  expect(result.isSecureContext).toBe(true);
  expect(result.hasSubtleCrypto).toBe(true);
};

test.describe('Apps - secure context', () => {
  test('the guest runs in a secure context with a usable subtle crypto', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    await test.step('Open an app previewing the report document', async () => {
      await openAppWith(page, electronApp, createTmpDir, 'context', REPORT_APP);
    });

    const result = await test.step('Read the guest report', () => awaitResult(page, electronApp, 20000));

    await test.step('Assert the guest runs in a secure context', async () => {
      expectSecureGuest(result);
      expect(result.digestError).toBeNull();
      expect(result.digest, 'SHA-256 digest is 32 bytes').toBe(32);
    });
  });

  test('two apps get separate origins', async ({ page, electronApp, createTmpDir }) => {
    const first = await test.step('Open the first app and read its report', async () => {
      await openAppWith(page, electronApp, createTmpDir, 'origin-a', REPORT_APP);
      return awaitResult(page, electronApp, 20000);
    });

    const second = await test.step('Open a second app and read its report', async () => {
      await openAppWith(page, electronApp, createTmpDir, 'origin-b', REPORT_APP);
      return awaitResult(page, electronApp, 20000);
    });

    await test.step('Assert both guests are secure and isolated from each other', async () => {
      expectSecureGuest(first);
      expectSecureGuest(second);
      expect(first.origin).not.toBe(second.origin);
    });
  });

  test('sensitive permissions are denied in the app guest', async ({ page, electronApp, createTmpDir }) => {
    await test.step('Open an app guest', async () => {
      await openAppWith(page, electronApp, createTmpDir, 'permissions', '<div id="out"></div>');
    });

    // guestEval runs with a user gesture. An onload probe would fail clipboard
    // checks for lack of a gesture, which would not exercise the permission handler.
    const raw = await test.step('Request clipboard, geolocation, and camera from the guest', () =>
      guestEval(
        page,
        electronApp,
        `(async function () {
          function withTimeout(work, ms) {
            return new Promise(function (resolve) {
              var done = false;
              var finish = function (value) {
                if (done) return;
                done = true;
                resolve(value);
              };
              setTimeout(function () { finish('timeout'); }, ms);
              Promise.resolve().then(work).then(finish, function (err) {
                finish((err && (err.name || err.message)) || 'error');
              });
            });
          }
          function query(name) {
            return navigator.permissions.query({ name: name }).then(
              function (status) { return status.state; },
              function (err) { return (err && err.name) || 'error'; }
            );
          }
          var clipboardRead = await withTimeout(function () {
            return navigator.clipboard.readText().then(function () { return 'granted'; });
          }, 3000);
          var geolocation = await withTimeout(function () {
            return new Promise(function (resolve) {
              navigator.geolocation.getCurrentPosition(
                function () { resolve('granted'); },
                function (err) { resolve('denied:' + err.code); }
              );
            });
          }, 3000);
          var camera = await withTimeout(function () {
            return navigator.mediaDevices.getUserMedia({ video: true }).then(function (stream) {
              stream.getTracks().forEach(function (track) { track.stop(); });
              return 'granted';
            });
          }, 3000);
          return JSON.stringify({
            clipboardRead: clipboardRead,
            geolocation: geolocation,
            camera: camera,
            clipboardWrite: await query('clipboard-write')
          });
        })()`
      ));

    const result = JSON.parse(raw as string);

    await test.step('Assert reads and device access are denied', async () => {
      expect(result.clipboardRead).toBe('NotAllowedError');
      expect(result.geolocation).toBe('denied:1');
      expect(result.camera).toBe('NotAllowedError');
      expect(result.clipboardWrite).toBe('granted');
    });
  });
});
