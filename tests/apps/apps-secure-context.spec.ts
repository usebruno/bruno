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
});
