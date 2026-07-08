// Canonical stringify (object keys sorted, array order preserved) so nested values like the
// additional-params arrays (authRequestParams/tokenRequestParams/refreshRequestParams) are
// compared structurally rather than by key order or reference.
const stableStringify = (v) => {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
};

// Normalize an auth object into { type, params: { key: value } }. Postman's v2.1 array-of-
// {key,value,type} representation is collapsed into a plain map so param ordering and the `type`
// tag (always 'string'/'any', not semantically meaningful) don't create false diffs. An absent
// auth block normalizes to null so "no auth" compares equal on both sides.
const normalizeAuth = (auth) => {
  if (!auth || !auth.type) return null;
  const result = { type: auth.type, params: {} };
  const params = auth[auth.type];
  if (Array.isArray(params)) {
    for (const { key, value } of params) {
      result.params[key] = value;
    }
  } else if (params && typeof params === 'object') {
    result.params = { ...params };
  }
  return result;
};

// Walk a Postman collection and collect every auth-bearing node keyed by a stable path:
//   'collection'                    -> collection-level auth
//   'collection/Folder'             -> folder-level auth
//   'collection/Folder/Request'     -> request-level auth
// Nodes with no auth are still recorded (auth: null) so a node that gains/loses auth is caught.
const collectAuthNodes = (collection) => {
  const nodes = {};
  nodes['collection'] = normalizeAuth(collection.auth);

  const walk = (items, parentPath) => {
    (items || []).forEach((item) => {
      const nodePath = `${parentPath}/${item.name}`;
      if (Array.isArray(item.item)) {
        // Folder: auth lives directly on the folder item.
        nodes[nodePath] = normalizeAuth(item.auth);
        walk(item.item, nodePath);
      } else {
        // Request: auth lives on item.request.auth.
        nodes[nodePath] = normalizeAuth(item.request && item.request.auth);
      }
    });
  };

  walk(collection.item, 'collection');
  return nodes;
};

// Diff the auth subtree of two Postman collections (original vs round-tripped). Returns a flat
// list of structured diffs. `kind` is one of:
//   'node-only-in-original' | 'node-only-in-roundtrip' | 'type-mismatch'
//   'key-missing-in-roundtrip' | 'key-only-in-roundtrip' | 'value-mismatch'
const diffAuthNodes = (originalCollection, roundTrippedCollection) => {
  const original = collectAuthNodes(originalCollection);
  const roundtrip = collectAuthNodes(roundTrippedCollection);
  const paths = [...new Set([...Object.keys(original), ...Object.keys(roundtrip)])].sort();

  const diffs = [];
  for (const nodePath of paths) {
    const a = original[nodePath];
    const b = roundtrip[nodePath];

    if (!(nodePath in original)) {
      diffs.push({ node: nodePath, kind: 'node-only-in-roundtrip', authType: b?.type ?? null });
      continue;
    }
    if (!(nodePath in roundtrip)) {
      diffs.push({ node: nodePath, kind: 'node-only-in-original', authType: a?.type ?? null });
      continue;
    }

    // Both null (no auth on either side) -> identical.
    if (a === null && b === null) continue;

    if ((a?.type ?? null) !== (b?.type ?? null)) {
      diffs.push({ node: nodePath, kind: 'type-mismatch', original: a?.type ?? null, roundTripped: b?.type ?? null });
      // Type differs; param-level comparison below would be noise, so skip it.
      continue;
    }

    const paramsA = a?.params || {};
    const paramsB = b?.params || {};
    // Grant type of the node (oauth2 only), taken from the original and falling back to the
    // round-tripped side. Attached to every oauth2 diff so the whitelist can accept a dropped
    // field ONLY for grant types that don't use it (grant-scoped pruning).
    const grantType = a?.type === 'oauth2' ? (paramsA.grant_type ?? paramsB.grant_type ?? null) : undefined;
    // An absent key and an empty-string value are equivalent: Postman treats a missing auth param
    // as unset, and brunoToPostman drops empty params on export, so this is a lossless round-trip.
    const isEmpty = (v) => v === undefined || v === '';

    const keys = [...new Set([...Object.keys(paramsA), ...Object.keys(paramsB)])].sort();
    for (const key of keys) {
      const vA = paramsA[key];
      const vB = paramsB[key];
      if (isEmpty(vA) && isEmpty(vB)) continue; // absent == empty on both sides
      const diff = { node: nodePath, authType: a.type, key };
      if (grantType !== undefined) diff.grantType = grantType;
      if (isEmpty(vA)) {
        diffs.push({ ...diff, kind: 'key-only-in-roundtrip', roundTripped: vB });
      } else if (isEmpty(vB)) {
        diffs.push({ ...diff, kind: 'key-missing-in-roundtrip', original: vA });
      } else if (stableStringify(vA) !== stableStringify(vB)) {
        diffs.push({ ...diff, kind: 'value-mismatch', original: vA, roundTripped: vB });
      }
    }
  }
  return diffs;
};

module.exports = { stableStringify, normalizeAuth, collectAuthNodes, diffAuthNodes };
