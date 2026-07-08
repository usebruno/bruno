import fs from 'fs';
import path from 'path';
import postmanToBruno from '../../../src/postman/postman-to-bruno';
import brunoToPostman from '../../../src/postman/bruno-to-postman';
import { diffAuthNodes } from './compare-auth';

/**
 * Round-trip auth fidelity: Postman -> Bruno -> Postman.
 *
 * Every real Postman export in ./fixtures is imported to Bruno and exported back to Postman; the
 * auth subtree of the result is compared against the auth subtree of the original export. This is
 * the direction where a real-world Postman file matters, because the *input* shape then matches
 * exactly what Postman emits (real key names, extra keys, v2.1 array format) instead of an
 * approximation hand-written in a test.
 *
 * Comparison is STRICT: any difference in the auth subtree is a failure. Some differences are
 * expected today. Those are recorded in AUTH_ROUNDTRIP_WHITELIST below with a category:
 *   - category 'feature-gap'     -> Bruno can't represent this Postman field yet; SHOULD shrink as
 *                                   gaps are filled. This is the number to drive toward zero.
 *   - category 'normalization'   -> intentional & permanent (default materialization, grant-scoped
 *                                   pruning); will NOT shrink.
 * (Empty-value differences are handled structurally in compare-auth.js — absent == "" — and never
 * reach the whitelist.)
 *
 * Whitelist entry matching:
 *   - fixture / node accept the literal value or '*' (wildcard) so a field-level gap that recurs
 *     across many nodes/fixtures is one entry, not dozens.
 *   - grantType (oauth2 only, optional): the diff is accepted ONLY when the node's grant type is in
 *     this list. This is how grant-scoped pruning is bounded — dropping authUrl is fine for
 *     client_credentials, but the SAME drop on an authorization_code grant is a real failure.
 *   - matching is value-agnostic (kind + key), so a whitelisted field tolerates any value.
 *
 * To add coverage: drop another *.postman_collection.json into ./fixtures — it is picked up
 * automatically. New whitelist entries are only needed if it exercises an unmodelled field.
 */

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

// Shape: { fixture, node, authType, key, kind, category, reason, grantType? }
// fixture/node support '*'. grantType (array) restricts an oauth2 entry to those grant types.
const AUTH_ROUNDTRIP_WHITELIST = [
  // --- feature-gap: Bruno does not model these Postman fields yet (drive this list to zero) ---
  // oauth1: Bruno models currently don't support the following.
  { fixture: '*', node: '*', authType: 'oauth1', key: 'addEmptyParamsToSign', kind: 'key-missing-in-roundtrip', category: 'feature-gap', reason: 'Bruno has no oauth1 addEmptyParamsToSign field' },
  { fixture: '*', node: '*', authType: 'oauth1', key: 'disableHeaderEncoding', kind: 'key-missing-in-roundtrip', category: 'feature-gap', reason: 'Bruno has no oauth1 disableHeaderEncoding field' },
  // digest: Bruno models only support username/password; the rest of Postman's digest params are dropped.
  { fixture: '*', node: '*', authType: 'digest', key: 'algorithm', kind: 'key-missing-in-roundtrip', category: 'feature-gap', reason: 'Bruno has no digest algorithm field' },
  { fixture: '*', node: '*', authType: 'digest', key: 'nonce', kind: 'key-missing-in-roundtrip', category: 'feature-gap', reason: 'Bruno has no digest nonce field' },
  { fixture: '*', node: '*', authType: 'digest', key: 'nonceCount', kind: 'key-missing-in-roundtrip', category: 'feature-gap', reason: 'Bruno has no digest nonceCount field' },
  { fixture: '*', node: '*', authType: 'digest', key: 'realm', kind: 'key-missing-in-roundtrip', category: 'feature-gap', reason: 'Bruno has no digest realm field' },
  { fixture: '*', node: '*', authType: 'digest', key: 'qop', kind: 'key-missing-in-roundtrip', category: 'feature-gap', reason: 'Bruno has no digest qop field' },
  { fixture: '*', node: '*', authType: 'digest', key: 'clientNonce', kind: 'key-missing-in-roundtrip', category: 'feature-gap', reason: 'Bruno has no digest client nonce field' },
  { fixture: '*', node: '*', authType: 'digest', key: 'opaque', kind: 'key-missing-in-roundtrip', category: 'feature-gap', reason: 'Bruno has no digest opaque field' },
  // ntlm: Bruno models support username/password/domain only.
  { fixture: '*', node: '*', authType: 'ntlm', key: 'workstation', kind: 'key-missing-in-roundtrip', category: 'feature-gap', reason: 'Bruno has no ntlm workstation field' },
  // oauth2: Bruno models currently don't support the following.
  { fixture: '*', node: '*', authType: 'oauth2', key: 'useBrowser', kind: 'key-missing-in-roundtrip', category: 'feature-gap', reason: 'Bruno has no oauth2 useBrowser field' },
  { fixture: '*', node: '*', authType: 'oauth2', key: 'code_verifier', kind: 'key-missing-in-roundtrip', category: 'feature-gap', reason: 'Bruno has no oauth2 code_verifier (PKCE) field' },

  // --- normalization: grant-scoped pruning (accepted ONLY for grants that don't use the field) ---
  { fixture: '*', node: '*', authType: 'oauth2', key: 'authUrl', kind: 'key-missing-in-roundtrip', grantType: ['client_credentials', 'password_credentials'], category: 'normalization', reason: 'authorizationUrl is unused by client_credentials/password grants, so Bruno drops it' },
  { fixture: '*', node: '*', authType: 'oauth2', key: 'redirect_uri', kind: 'key-missing-in-roundtrip', grantType: ['client_credentials', 'password_credentials'], category: 'normalization', reason: 'callbackUrl is unused by client_credentials/password grants, so Bruno drops it' },
  { fixture: '*', node: '*', authType: 'oauth2', key: 'username', kind: 'key-missing-in-roundtrip', grantType: ['client_credentials', 'authorization_code', 'authorization_code_with_pkce', 'implicit'], category: 'normalization', reason: 'username is used only by the password grant, so Bruno drops it elsewhere' },
  { fixture: '*', node: '*', authType: 'oauth2', key: 'password', kind: 'key-missing-in-roundtrip', grantType: ['client_credentials', 'authorization_code', 'authorization_code_with_pkce', 'implicit'], category: 'normalization', reason: 'password is used only by the password grant, so Bruno drops it elsewhere' },

  // --- normalization: default materialization (Postman omits, defaults it; Bruno emits explicitly) ---
  { fixture: '*', node: '*', authType: 'apikey', key: 'in', kind: 'key-only-in-roundtrip', category: 'normalization', reason: 'Postman defaults apikey placement to header when omitted; Bruno emits it' },
  { fixture: '*', node: '*', authType: 'oauth1', key: 'version', kind: 'key-only-in-roundtrip', category: 'normalization', reason: 'Bruno materializes default version=1.0 (== Postman default)' }
];

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, file), 'utf8'));

const matchesField = (w, v) => w === '*' || w === v;

const isWhitelisted = (fixture, diff) =>
  AUTH_ROUNDTRIP_WHITELIST.some(
    (w) =>
      matchesField(w.fixture, fixture)
      && matchesField(w.node, diff.node)
      && (w.authType ?? null) === (diff.authType ?? null)
      && (w.key ?? null) === (diff.key ?? null)
      && w.kind === diff.kind
      && (!w.grantType || (diff.grantType != null && w.grantType.includes(diff.grantType)))
  );

const fixtureFiles = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.postman_collection.json'));

// Readable one-liner for each diff, used in the failure message.
const formatDiff = (d) => {
  const loc = `[${d.node}]${d.key ? ` ${d.authType}.${d.key}` : d.authType ? ` (${d.authType})` : ''}`;
  switch (d.kind) {
    case 'key-missing-in-roundtrip':
      return `${loc} DROPPED on round-trip (original=${JSON.stringify(d.original)})`;
    case 'key-only-in-roundtrip':
      return `${loc} ADDED on round-trip (roundtrip=${JSON.stringify(d.roundTripped)})`;
    case 'value-mismatch':
      return `${loc} CHANGED original=${JSON.stringify(d.original)} roundtrip=${JSON.stringify(d.roundTripped)}`;
    case 'type-mismatch':
      return `${loc} TYPE CHANGED original=${JSON.stringify(d.original)} roundtrip=${JSON.stringify(d.roundTripped)}`;
    default:
      return `${loc} ${d.kind}`;
  }
};

describe('auth round-trip (Postman -> Bruno -> Postman)', () => {
  it.each(fixtureFiles)('preserves the auth subtree of %s', async (fixture) => {
    const original = readJson(fixture);
    const { collection } = await postmanToBruno(original);
    const roundTripped = brunoToPostman(collection);

    const allDiffs = diffAuthNodes(original, roundTripped);
    const unexpected = allDiffs.filter((d) => !isWhitelisted(fixture, d));

    if (unexpected.length) {
      // Surface a human-readable summary alongside Jest's structured dump.
      console.log(`\n[${fixture}] ${unexpected.length} un-whitelisted auth diff(s):`);
      unexpected.forEach((d) => console.log('  ' + formatDiff(d)));
    }

    expect(unexpected).toEqual([]);
  });
});
