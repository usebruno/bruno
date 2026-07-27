// RFC 7396 JSON Merge Patch.
// https://datatracker.ietf.org/doc/html/rfc7396
//
// Used by `bru request edit --patch '{...}'`: agents send a partial document; the
// target is read from disk, patched, stringified back via bruno-lang. Arrays and
// scalars are replaced wholesale (RFC 7396 §1); objects merge recursively; explicit
// `null` deletes the key.
const mergePatch = (target, patch) => {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
    return patch;
  }
  let base = target;
  if (base === null || typeof base !== 'object' || Array.isArray(base)) {
    base = {};
  }
  const result = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
    } else {
      result[key] = mergePatch(result[key], value);
    }
  }
  return result;
};

module.exports = { mergePatch };
