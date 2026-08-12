// Single source of truth for the DataType reference-mismatch matrix.
//
// Each Case row pairs a fixture variable name with the (declared × target)
// pair it exercises and the expected flag/no-flag outcome. The spec iterates
// this table so adding a case = one row here + one entry in the fixture YAML.
//
// The reader can grep CASES for a target type to see whether it has coverage
// against every declared type — and INTENDED_MATRIX below fails the run if a
// cell is missing.

export type Declared = 'string' | 'number' | 'boolean' | 'object';

export type Target = | 'string' | 'number' | 'boolean' | 'object' | 'nested-string' | 'nested-number' | 'nested-boolean' | 'dotted-key-boolean' | 'array[number]' | 'array[boolean]' | 'array-itself';

export type Scope = 'global' | 'collection';

export type Case = {
  varName: string;
  declared: Declared;
  target: Target;
  expected: 'ok' | 'flagged';
  scope: Scope;
};

export const DECLARED: Declared[] = ['string', 'number', 'boolean', 'object'];

// Literal (non-reference) fixture rows — sanity check that non-references
// still validate correctly and no reference-resolution regression flagged them.
export const LITERAL_ROWS: string[] = [
  'globalEnvString',
  'globalEnvNumber',
  'globalEnvBoolean',
  'globalEnvObject',
  'globalEnvNestedObject',
  'globalEnvObject.port',
  'globalEnvObjectWithArray'
];

export const CASES: Case[] = [
  // ─────────────────────────────────────────────────────────────────────
  // global env — same-type references (no flag)
  // ─────────────────────────────────────────────────────────────────────
  { varName: 'stringTypeRefersToString', declared: 'string', target: 'string', expected: 'ok', scope: 'global' },
  { varName: 'numberTypeRefersToNumber', declared: 'number', target: 'number', expected: 'ok', scope: 'global' },
  { varName: 'booleanTypeRefersToBoolean', declared: 'boolean', target: 'boolean', expected: 'ok', scope: 'global' },
  { varName: 'objectTypeRefersToObject', declared: 'object', target: 'object', expected: 'ok', scope: 'global' },

  // ─────────────────────────────────────────────────────────────────────
  // global env — nested-path references (dotted walk)
  // ─────────────────────────────────────────────────────────────────────
  { varName: 'stringTypeRefersToNestedString', declared: 'string', target: 'nested-string', expected: 'ok', scope: 'global' },
  { varName: 'numberTypeRefersToNestedNumber', declared: 'number', target: 'nested-number', expected: 'ok', scope: 'global' },
  { varName: 'booleanTypeRefersToNestedBoolean', declared: 'boolean', target: 'nested-boolean', expected: 'ok', scope: 'global' },
  { varName: 'numberTypeRefersToNestedString', declared: 'number', target: 'nested-string', expected: 'flagged', scope: 'global' },
  { varName: 'booleanTypeRefersToNestedNumber', declared: 'boolean', target: 'nested-number', expected: 'flagged', scope: 'global' },

  // ─────────────────────────────────────────────────────────────────────
  // global env — literal dotted-key references (hasOwnProperty branch)
  // ─────────────────────────────────────────────────────────────────────
  { varName: 'booleanTypeRefersToDottedKey', declared: 'boolean', target: 'dotted-key-boolean', expected: 'ok', scope: 'global' },

  // ─────────────────────────────────────────────────────────────────────
  // global env — array-index references (numeric path segment)
  // ─────────────────────────────────────────────────────────────────────
  { varName: 'numberTypeRefersToArrayNumber', declared: 'number', target: 'array[number]', expected: 'ok', scope: 'global' },
  { varName: 'booleanTypeRefersToArrayBoolean', declared: 'boolean', target: 'array[boolean]', expected: 'ok', scope: 'global' },
  { varName: 'objectTypeRefersToArray', declared: 'object', target: 'array-itself', expected: 'ok', scope: 'global' },
  { varName: 'numberTypeRefersToArrayBoolean', declared: 'number', target: 'array[boolean]', expected: 'flagged', scope: 'global' },
  { varName: 'objectTypeRefersToArrayBoolean', declared: 'object', target: 'array[boolean]', expected: 'flagged', scope: 'global' },

  // ─────────────────────────────────────────────────────────────────────
  // global env — cross-type references (flagged)
  // ─────────────────────────────────────────────────────────────────────
  { varName: 'numberTypeRefersToString', declared: 'number', target: 'string', expected: 'flagged', scope: 'global' },
  { varName: 'booleanTypeRefersToObject', declared: 'boolean', target: 'object', expected: 'flagged', scope: 'global' },
  { varName: 'objectTypeRefersToBoolean', declared: 'object', target: 'boolean', expected: 'flagged', scope: 'global' },

  // ─────────────────────────────────────────────────────────────────────
  // global env — declared:string is permissive; it accepts every target
  // ─────────────────────────────────────────────────────────────────────
  { varName: 'stringTypeRefersToNumber', declared: 'string', target: 'number', expected: 'ok', scope: 'global' },
  { varName: 'stringTypeRefersToArrayBoolean', declared: 'string', target: 'array[boolean]', expected: 'ok', scope: 'global' },

  // ─────────────────────────────────────────────────────────────────────
  // collection env — same-type references to a global target (no flag)
  // ─────────────────────────────────────────────────────────────────────
  { varName: 'stringTypeRefersToGlobalString', declared: 'string', target: 'string', expected: 'ok', scope: 'collection' },
  { varName: 'numberTypeRefersToGlobalNumber', declared: 'number', target: 'number', expected: 'ok', scope: 'collection' },
  { varName: 'booleanTypeRefersToGlobalBoolean', declared: 'boolean', target: 'boolean', expected: 'ok', scope: 'collection' },
  { varName: 'objectTypeRefersToGlobalObject', declared: 'object', target: 'object', expected: 'ok', scope: 'collection' },
  { varName: 'stringTypeRefersToGlobalNestedString', declared: 'string', target: 'nested-string', expected: 'ok', scope: 'collection' },
  { varName: 'numberTypeRefersToGlobalNestedNumber', declared: 'number', target: 'nested-number', expected: 'ok', scope: 'collection' },
  { varName: 'booleanTypeRefersToGlobalNestedBoolean', declared: 'boolean', target: 'nested-boolean', expected: 'ok', scope: 'collection' },

  // ─────────────────────────────────────────────────────────────────────
  // collection env — declared:string accepts any global target
  // ─────────────────────────────────────────────────────────────────────
  { varName: 'stringTypeRefersToGlobalNumber', declared: 'string', target: 'number', expected: 'ok', scope: 'collection' },

  // ─────────────────────────────────────────────────────────────────────
  // collection env — cross-type references to a global target (flagged)
  // ─────────────────────────────────────────────────────────────────────
  { varName: 'numberTypeRefersToGlobalString', declared: 'number', target: 'string', expected: 'flagged', scope: 'collection' },
  { varName: 'booleanTypeRefersToGlobalObject', declared: 'boolean', target: 'object', expected: 'flagged', scope: 'collection' },
  { varName: 'objectTypeRefersToGlobalBoolean', declared: 'object', target: 'boolean', expected: 'flagged', scope: 'collection' },
  { varName: 'numberTypeRefersToGlobalNestedString', declared: 'number', target: 'nested-string', expected: 'flagged', scope: 'collection' },
  { varName: 'booleanTypeRefersToGlobalNestedNumber', declared: 'boolean', target: 'nested-number', expected: 'flagged', scope: 'collection' }
];

// Intended coverage matrix. Each cell says what a *meaningful* combination
// should resolve to; the coverage test fails when a non-'skip' cell has no
// case proving it in either scope.
//
//                  string   number   boolean  object   nested-  nested-  nested-  dotted-  array    array    array-
//                                                       string   number   boolean  key-b    [num]    [bool]   itself
// declared:string    ok       ok       skip     skip     ok       skip     skip     skip     skip     ok       skip
// declared:number    flagged  ok       skip     skip     flagged  ok       skip     skip     ok       flagged  skip
// declared:boolean   skip     skip     ok       flagged  skip     flagged  ok       ok       skip     ok       skip
// declared:object    skip     skip     flagged  ok       skip     skip     skip     skip     skip     flagged  ok
//
// 'skip' = combination is either redundant (covered by another cell that
// exercises the same code path) or not meaningful. Keep the grid small on
// purpose: exhaustive 4×11 would generate cases that all hit the same branch.
export const INTENDED_MATRIX: Record<Declared, Partial<Record<Target, 'ok' | 'flagged'>>> = {
  string: {
    'string': 'ok',
    'number': 'ok',
    'nested-string': 'ok',
    'array[boolean]': 'ok'
  },
  number: {
    'number': 'ok',
    'string': 'flagged',
    'nested-string': 'flagged',
    'nested-number': 'ok',
    'array[number]': 'ok',
    'array[boolean]': 'flagged'
  },
  boolean: {
    'boolean': 'ok',
    'object': 'flagged',
    'nested-boolean': 'ok',
    'nested-number': 'flagged',
    'dotted-key-boolean': 'ok',
    'array[boolean]': 'ok'
  },
  object: {
    'object': 'ok',
    'boolean': 'flagged',
    'array-itself': 'ok',
    'array[boolean]': 'flagged'
  }
};
