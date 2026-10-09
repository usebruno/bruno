/**
 * The single source of truth for how Postman's and Bruno's script APIs correspond.
 *
 * Both direction-specific registries are derived from this table by `derive.js`. A pairing
 * therefore cannot be added to one direction and forgotten in the other, and the two
 * directions cannot disagree about which members pair up — the round-trip property holds by
 * construction rather than by assertion.
 *
 * ## Member rows
 *
 * A row with both `pm` and `bru` pairs those members. A row with one name declares a member
 * that exists but has no counterpart, and must carry `unsupported`.
 *
 * | Key                 | Meaning                                                              |
 * |---------------------|----------------------------------------------------------------------|
 * | `pm` / `bru`        | Member name on each side                                              |
 * | `pmKind` / `bruKind`| `'method'` or `'property'` — given together, and only when they differ |
 * | `direction`         | `'pm->bru'` or `'bru->pm'` when the row applies one way only          |
 * | `pmToBru`/`bruToPm` | What becomes of the yielded value in that direction (see below)       |
 * | `unsupported`       | Why this member has no counterpart                                    |
 *
 * `pmToBru` / `bruToPm` carry one of:
 *   `{ coerce: '<name>' }` — a coercion from coercions.js, applied where the value is
 *                            produced, recovers the shape the source script expects
 *   `{ lost: '<reason>' }` — the two shapes differ and no expression bridges them; the call
 *                            is still renamed, but its result is flagged rather than typed
 *
 * A member absent from a type's rows is one nobody has classified yet. Rows are added as the
 * surface is worked through; `BrunoCookieJar` is complete against the jar handle in
 * `@usebruno/requests`, `PostmanResponse` is not yet exhaustive.
 */

const RESPONSE = {
  postman: 'PostmanResponse',
  bruno: 'BrunoResponse',

  members: [
    // Postman's `code` is the status number and its `status` the status text, so both shift a name
    { pm: 'code', bru: 'status' },
    { pm: 'status', bru: 'statusText' },

    { pm: 'json', bru: 'data', pmKind: 'method', bruKind: 'property' },

    // `data` translates back to json(), so text() only has a way out
    {
      pm: 'text',
      bru: 'data',
      pmKind: 'method',
      bruKind: 'property',
      direction: 'pm->bru'
    },

    {
      pm: 'headers',
      bru: 'headers',
      pmToBru: { lost: 'Postman headers is a HeaderList with .get(); Bruno\'s is a plain object' },
      bruToPm: { lost: 'Bruno headers is a plain object; Postman\'s is a HeaderList with .get()' }
    }
  ]
};

const COOKIE_JAR = {
  postman: 'PostmanCookieJar',
  bruno: 'BrunoCookieJar',

  members: [
    { pm: 'unset', bru: 'deleteCookie' },

    // Postman's clear is url-scoped, which is what deleteCookies does; Bruno's own clear() is not
    { pm: 'clear', bru: 'deleteCookies' },

    {
      pm: 'get',
      bru: 'getCookie',
      pmToBru: { coerce: 'cookieToValue' },
      bruToPm: { lost: 'Postman jar.get yields the cookie value, not the cookie object' }
    },

    {
      pm: 'getAll',
      bru: 'getCookies',
      pmToBru: { lost: 'Postman yields a PropertyList with .get()/.count(); Bruno yields an array' },
      bruToPm: { lost: 'Bruno yields an array; Postman yields a PropertyList with .get()/.count()' }
    },

    {
      pm: 'set',
      bru: 'setCookie',
      pmToBru: { lost: 'Postman yields the cookie it set; Bruno\'s setCookie resolves to nothing' }
    },

    {
      bru: 'clear',
      unsupported: 'clears every domain; Postman\'s clear(url) is url-scoped, and no Postman jar method clears them all'
    },
    { bru: 'hasCookie', unsupported: 'no Postman cookie jar equivalent' },
    { bru: 'setCookies', unsupported: 'no Postman cookie jar equivalent' }
  ]
};

/**
 * Calls that bring a typed value into a script. `yields` and the handler entries name a type
 * *pair*, which `derive.js` resolves to that side's type name. `bothSpellings` registers the call
 * under its Postman *and* its Bruno path in both registries, since a script reaching this pass
 * may already be partly translated.
 */
const ENTRY_POINTS = [
  {
    pm: 'pm.sendRequest',
    bru: 'bru.sendRequest',
    yields: 'Response',
    // `callback` is the node-style `(err, res)` argument, `then` a promise-chain handler
    handlers: { callback: [null, 'Response'], then: ['Response'] }
  },
  {
    pm: 'pm.cookies.jar',
    bru: 'bru.cookies.jar',
    yields: 'CookieJar',
    bothSpellings: true
  }
];

/** Type pairs, keyed by the short name `yields` and the handler entries use. */
const TYPE_PAIRS = {
  Response: RESPONSE,
  CookieJar: COOKIE_JAR
};

export default { typePairs: TYPE_PAIRS, entryPoints: ENTRY_POINTS };
