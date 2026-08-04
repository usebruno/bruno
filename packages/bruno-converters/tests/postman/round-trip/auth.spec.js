import fs from 'fs';
import path from 'path';
import postmanToBruno from '../../../src/postman/postman-to-bruno';
import brunoToPostman from '../../../src/postman/bruno-to-postman';
import { diffAuthNodes } from './compare-auth';
import { DiffKind } from '../../common/diff-kind';

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

const AUTH_TYPES = Object.freeze({
  BASIC: 'basic',
  BEARER: 'bearer',
  AWSV4: 'awsv4',
  APIKEY: 'apikey',
  DIGEST: 'digest',
  NTLM: 'ntlm',
  OAUTH1: 'oauth1',
  OAUTH2: 'oauth2',
  EDGEGRID: 'edgegrid',
  NOAUTH: 'noauth'
});

// Shape: { fixture, node, authType, key, kind, category, reason, grantType? }
// fixture/node support '*'. grantType (array) restricts an oauth2 entry to those grant types.
const AUTH_ROUNDTRIP_WHITELIST = [
  // --- feature-gap: Bruno does not model these Postman fields yet (drive this list to zero) ---
  // oauth1: Bruno models currently don't support the following.
  { fixture: '*', node: '*', authType: AUTH_TYPES.OAUTH1, key: 'addEmptyParamsToSign', kind: DiffKind.KEY_MISSING_IN_ROUNDTRIP, category: 'feature-gap', reason: 'Bruno has no oauth1 addEmptyParamsToSign field' },
  { fixture: '*', node: '*', authType: AUTH_TYPES.OAUTH1, key: 'disableHeaderEncoding', kind: DiffKind.KEY_MISSING_IN_ROUNDTRIP, category: 'feature-gap', reason: 'Bruno has no oauth1 disableHeaderEncoding field' },
  // digest: Bruno models only support username/password; the rest of Postman's digest params are dropped.
  { fixture: '*', node: '*', authType: AUTH_TYPES.DIGEST, key: 'algorithm', kind: DiffKind.KEY_MISSING_IN_ROUNDTRIP, category: 'feature-gap', reason: 'Bruno has no digest algorithm field' },
  { fixture: '*', node: '*', authType: AUTH_TYPES.DIGEST, key: 'nonce', kind: DiffKind.KEY_MISSING_IN_ROUNDTRIP, category: 'feature-gap', reason: 'Bruno has no digest nonce field' },
  { fixture: '*', node: '*', authType: AUTH_TYPES.DIGEST, key: 'nonceCount', kind: DiffKind.KEY_MISSING_IN_ROUNDTRIP, category: 'feature-gap', reason: 'Bruno has no digest nonceCount field' },
  { fixture: '*', node: '*', authType: AUTH_TYPES.DIGEST, key: 'realm', kind: DiffKind.KEY_MISSING_IN_ROUNDTRIP, category: 'feature-gap', reason: 'Bruno has no digest realm field' },
  { fixture: '*', node: '*', authType: AUTH_TYPES.DIGEST, key: 'qop', kind: DiffKind.KEY_MISSING_IN_ROUNDTRIP, category: 'feature-gap', reason: 'Bruno has no digest qop field' },
  { fixture: '*', node: '*', authType: AUTH_TYPES.DIGEST, key: 'clientNonce', kind: DiffKind.KEY_MISSING_IN_ROUNDTRIP, category: 'feature-gap', reason: 'Bruno has no digest client nonce field' },
  { fixture: '*', node: '*', authType: AUTH_TYPES.DIGEST, key: 'opaque', kind: DiffKind.KEY_MISSING_IN_ROUNDTRIP, category: 'feature-gap', reason: 'Bruno has no digest opaque field' },
  // ntlm: Bruno models support username/password/domain only.
  { fixture: '*', node: '*', authType: AUTH_TYPES.NTLM, key: 'workstation', kind: DiffKind.KEY_MISSING_IN_ROUNDTRIP, category: 'feature-gap', reason: 'Bruno has no ntlm workstation field' },
  // oauth2: Bruno models currently don't support the following.
  { fixture: '*', node: '*', authType: AUTH_TYPES.OAUTH2, key: 'useBrowser', kind: DiffKind.KEY_MISSING_IN_ROUNDTRIP, category: 'feature-gap', reason: 'Bruno has no oauth2 useBrowser field' },
  { fixture: '*', node: '*', authType: AUTH_TYPES.OAUTH2, key: 'code_verifier', kind: DiffKind.KEY_MISSING_IN_ROUNDTRIP, category: 'feature-gap', reason: 'Bruno has no oauth2 code_verifier (PKCE) field' },
  { fixture: '*', node: '*', authType: AUTH_TYPES.OAUTH2, key: 'challengeAlgorithm', kind: DiffKind.KEY_MISSING_IN_ROUNDTRIP, category: 'feature-gap', reason: 'Bruno has no oauth2 code verifier - challenge algorithm' },

  // --- normalization: grant-scoped pruning (accepted ONLY for grants that don't use the field) ---
  { fixture: '*', node: '*', authType: AUTH_TYPES.OAUTH2, key: 'authUrl', kind: DiffKind.KEY_MISSING_IN_ROUNDTRIP, grantType: ['client_credentials', 'password_credentials'], category: 'normalization', reason: 'authorizationUrl is unused by client_credentials/password grants, so Bruno drops it' },
  { fixture: '*', node: '*', authType: AUTH_TYPES.OAUTH2, key: 'redirect_uri', kind: DiffKind.KEY_MISSING_IN_ROUNDTRIP, grantType: ['client_credentials', 'password_credentials'], category: 'normalization', reason: 'callbackUrl is unused by client_credentials/password grants, so Bruno drops it' },
  { fixture: '*', node: '*', authType: AUTH_TYPES.OAUTH2, key: 'username', kind: DiffKind.KEY_MISSING_IN_ROUNDTRIP, grantType: ['client_credentials', 'authorization_code', 'authorization_code_with_pkce', 'implicit'], category: 'normalization', reason: 'username is used only by the password grant, so Bruno drops it elsewhere' },
  { fixture: '*', node: '*', authType: AUTH_TYPES.OAUTH2, key: 'password', kind: DiffKind.KEY_MISSING_IN_ROUNDTRIP, grantType: ['client_credentials', 'authorization_code', 'authorization_code_with_pkce', 'implicit'], category: 'normalization', reason: 'password is used only by the password grant, so Bruno drops it elsewhere' },

  // --- normalization: default materialization (Postman omits, defaults it; Bruno emits explicitly) ---
  { fixture: '*', node: '*', authType: AUTH_TYPES.APIKEY, key: 'in', kind: DiffKind.KEY_ONLY_IN_ROUNDTRIP, category: 'normalization', reason: 'Postman defaults apikey placement to header when omitted; Bruno emits it' },
  { fixture: '*', node: '*', authType: AUTH_TYPES.OAUTH1, key: 'version', kind: DiffKind.KEY_ONLY_IN_ROUNDTRIP, category: 'normalization', reason: 'Bruno materializes default version=1.0 (== Postman default)' }
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
    case DiffKind.KEY_MISSING_IN_ROUNDTRIP:
      return `${loc} DROPPED on round-trip (original=${JSON.stringify(d.original)})`;
    case DiffKind.KEY_ONLY_IN_ROUNDTRIP:
      return `${loc} ADDED on round-trip (roundtrip=${JSON.stringify(d.roundTripped)})`;
    case DiffKind.VALUE_MISMATCH:
      return `${loc} CHANGED original=${JSON.stringify(d.original)} roundtrip=${JSON.stringify(d.roundTripped)}`;
    case DiffKind.TYPE_MISMATCH:
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
