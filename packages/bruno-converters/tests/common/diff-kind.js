// Kinds of structural diff produced when comparing two collections during a round-trip test
// (e.g. Postman -> Bruno -> Postman).
//
//   NODE_ONLY_IN_ORIGINAL    -> a node exists only in the original collection
//   NODE_ONLY_IN_ROUNDTRIP   -> a node exists only in the round-tripped collection
//   TYPE_MISMATCH            -> the node exists on both sides but its type differs
//   KEY_MISSING_IN_ROUNDTRIP -> a field present in the original was dropped on round-trip
//   KEY_ONLY_IN_ROUNDTRIP    -> a field absent in the original was added on round-trip
//   VALUE_MISMATCH           -> a field exists on both sides but its value differs
export const DiffKind = Object.freeze({
  NODE_ONLY_IN_ORIGINAL: 'node-only-in-original',
  NODE_ONLY_IN_ROUNDTRIP: 'node-only-in-roundtrip',
  TYPE_MISMATCH: 'type-mismatch',
  KEY_MISSING_IN_ROUNDTRIP: 'key-missing-in-roundtrip',
  KEY_ONLY_IN_ROUNDTRIP: 'key-only-in-roundtrip',
  VALUE_MISMATCH: 'value-mismatch'
});
