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
 * | Key                 | Meaning                                                                |
 * |---------------------|------------------------------------------------------------------------|
 * | `pm` / `bru`        | Member name on each side                                               |
 * | `pmKind` / `bruKind`| `'method'` or `'property'` — given together, and only when they differ |
 * | `direction`         | `'pm->bru'` or `'bru->pm'` when the row applies one way only           |
 * | `yields`            | How the two sides' values relate, stated once (see below)              |
 * | `unsupported`       | Why this member has no counterpart                                     |
 *
 * `yields` is one bidirectional fact, not two mirrored ones — `derive.js` works out what
 * each direction has to do about it:
 *   `{ type: '<pair>' }`        — both sides yield that pair, so its members translate in turn
 *   `{ type: '<pair>',          — that side yields only this member of what the other side
 *      pmProjects: '<member>' }`   yields whole. The member is named in the projecting side's
 *     or `bruProjects`             spelling and resolved through the pair, so translating
 *                                  towards the whole value appends the *other* side's name
 *                                  for it, and translating away cannot rebuild what was lost
 *   `{ differs: '<reason>' }`   — the shapes are incomparable; the call is still renamed and
 *                                 the occurrence reported
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
      yields: { differs: 'Postman headers is a HeaderList with .get(); Bruno\'s is a plain object' }
    }
  ]
};

const COOKIE_JAR = {
  postman: 'PostmanCookieJar',
  bruno: 'BrunoCookieJar',

  members: [
    {
      pm: 'unset',
      bru: 'deleteCookie',
      yields: { differs: 'Postman reports completion to a callback; Bruno\'s deleteCookie resolves a promise' }
    },

    // Postman's clear is url-scoped, which is what deleteCookies does; Bruno's own clear() is not
    {
      pm: 'clear',
      bru: 'deleteCookies',
      yields: { differs: 'Postman reports completion to a callback; Bruno\'s deleteCookies resolves a promise' }
    },

    // Bruno hands back the cookie, Postman only its value
    { pm: 'get', bru: 'getCookie', yields: { type: 'Cookie', pmProjects: 'value' } },

    {
      pm: 'getAll',
      bru: 'getCookies',
      yields: { differs: 'Postman yields a PropertyList with .get()/.count(); Bruno yields an array' }
    },

    {
      pm: 'set',
      bru: 'setCookie',
      yields: { differs: 'Postman yields the cookie it set; Bruno\'s setCookie resolves to nothing' }
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
 * The cookie object both jars hand back. Only the member something projects from needs a row
 * today — the rest of the surface is spelled the same on each side, so it is already correct
 * untranslated.
 */
const COOKIE = {
  postman: 'PostmanCookie',
  bruno: 'BrunoCookie',

  members: [
    { pm: 'value', bru: 'value' }
  ]
};

/**
 * Calls that bring a typed value into a script.
 *
 * `yields` takes the same object a member row's does, so the field means one thing everywhere in
 * this file, and a handler slot names its type the same way. A producer or a parameter can only
 * say `{ type }` though: neither has a second side to differ from, and a value worth no type is
 * one to leave the slot empty for.
 *
 * `handlers` declares only the slots that cannot be worked out, which means the callback forms.
 * A promise handler is not declared: `.then` receives what the call yields, and that is promise
 * semantics rather than a fact about either API.
 *
 * `bothSpellings` registers the call under its Postman *and* its Bruno path in both registries,
 * since a script reaching this pass may already be partly translated.
 */
const ENTRY_POINTS = [
  {
    pm: 'pm.sendRequest',
    bru: 'bru.sendRequest',
    yields: { type: 'Response' },
    // the node-style `(err, res)` argument. A promise handler needs no slot: `.then` receives
    // whatever the call yields, which `yields` already says.
    handlers: { callback: [null, { type: 'Response' }] }
  },
  {
    pm: 'pm.cookies.jar',
    bru: 'bru.cookies.jar',
    yields: { type: 'CookieJar' },
    bothSpellings: true
  }
];

/** Type pairs, keyed by the short name every `{ type }` refers to. */
const TYPE_PAIRS = {
  Response: RESPONSE,
  CookieJar: COOKIE_JAR,
  Cookie: COOKIE
};

export default { typePairs: TYPE_PAIRS, entryPoints: ENTRY_POINTS };
