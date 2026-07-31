const crypto = require('crypto');
const { protocol, session } = require('electron');

const APP_SCHEME = 'bruno-app';

// Must match the `partition` attribute on the app <webview> in bruno-app.
// Deliberately not a `persist:` partition: guest origins are minted per
// session, so persisted per-origin storage could never be reused and would
// only accumulate orphaned data on disk.
const APP_PARTITION = 'bruno-app-view';

/**
 * Registry of app guest documents, served to <webview> guests over the
 * privileged `bruno-app://` scheme.
 *
 * Guests cannot be inlined as `data:text/html`: that yields an opaque origin,
 * which is not a secure context, so `crypto.subtle` is unavailable and any
 * third-party SDK requiring one refuses to initialise (Stripe.js throws from
 * its own constructor). Registering the scheme as `secure` restores those APIs
 * without opening a socket — requests are intercepted inside Chromium and
 * answered from this map.
 *
 * The token is the URL's **host**, not a path segment: for a `standard` scheme
 * the origin is `scheme://host`, so a per-app token keeps each guest on its own
 * origin. Putting it in the path would place every app on one shared origin,
 * letting apps reach each other's storage.
 *
 * The token is stable for an owner's lifetime; only the `v` query parameter
 * changes when the document's html changes. That keeps the origin (and the
 * guest's storage) stable across code edits, gives the renderer a changed src
 * to reload the webview with, and keeps the URL a mounted guest already holds
 * resolvable — a reload of the old URL serves the latest html instead of 404ing
 * out from under it.
 */
class AppDocuments {
  constructor() {
    this.entriesByOwner = new Map();
    this.htmlByToken = new Map();
  }

  /**
   * Must run before `app.ready`; Electron ignores scheme privileges registered
   * afterwards.
   */
  static registerScheme() {
    protocol.registerSchemesAsPrivileged([
      {
        scheme: APP_SCHEME,
        privileges: {
          standard: true,
          secure: true,
          supportFetchAPI: true
        }
      }
    ]);
  }

  /**
   * Registers the scheme handler on the app webview's own session. The
   * top-level `protocol.handle` only covers the default session, and guests run
   * in their own partition — without this the scheme resolves nowhere, and
   * Chromium hands the URL to the OS as an external link.
   */
  handleProtocol() {
    session.fromPartition(APP_PARTITION).protocol.handle(APP_SCHEME, (request) => {
      const html = this.htmlByToken.get(new URL(request.url).hostname);
      if (!html) {
        return new Response(null, { status: 404 });
      }
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store'
        }
      });
    });
  }

  /**
   * Returns a URL serving `html` for `ownerKey`. Re-registering identical html
   * returns the same URL, so a re-render does not reload the guest.
   */
  register(ownerKey, html) {
    let entry = this.entriesByOwner.get(ownerKey);
    if (entry && entry.html === html) {
      return this.urlFor(entry);
    }

    if (entry) {
      entry.html = html;
      entry.version += 1;
    } else {
      entry = { token: crypto.randomUUID(), html, version: 1 };
      this.entriesByOwner.set(ownerKey, entry);
    }
    this.htmlByToken.set(entry.token, html);
    return this.urlFor(entry);
  }

  /**
   * Frees the owner's document. Its bruno-app:// URL stops resolving; the guest
   * pointing at it is expected to be unmounted by then.
   */
  unregister(ownerKey) {
    const entry = this.entriesByOwner.get(ownerKey);
    if (!entry) return;
    this.htmlByToken.delete(entry.token);
    this.entriesByOwner.delete(ownerKey);
  }

  urlFor(entry) {
    return `${APP_SCHEME}://${entry.token}/?v=${entry.version}`;
  }
}

module.exports = AppDocuments;
module.exports.APP_SCHEME = APP_SCHEME;
module.exports.APP_PARTITION = APP_PARTITION;
