import COERCIONS from './coercions';

const KINDS = ['method', 'property'];
const DIRECTIONS = ['pm->bru', 'bru->pm'];

/**
 * Rejects a row the engine could not act on. A malformed row is a mistake in the table
 * rather than a condition to translate around, so it fails at import instead of quietly
 * dropping the member.
 */
const validateRow = (row, typeName) => {
  const where = `${typeName}.${row.pm || row.bru}`;

  if (!row.pm && !row.bru) throw new Error(`correspondence: a row of ${typeName} names no member`);

  if (row.pm && row.bru) {
    if (row.unsupported) throw new Error(`correspondence: ${where} is paired and marked unsupported`);
  } else if (!row.unsupported) {
    throw new Error(`correspondence: ${where} is one-sided and must say why it is unsupported`);
  }

  if (Boolean(row.pmKind) !== Boolean(row.bruKind)) {
    throw new Error(`correspondence: ${where} gives one side's kind without the other's`);
  }
  [row.pmKind, row.bruKind].forEach((kind) => {
    if (kind && !KINDS.includes(kind)) throw new Error(`correspondence: ${where} has kind '${kind}'`);
  });

  if (row.direction && !DIRECTIONS.includes(row.direction)) {
    throw new Error(`correspondence: ${where} has direction '${row.direction}'`);
  }

  [row.pmToBru, row.bruToPm].forEach((yields) => {
    if (!yields) return;
    const keys = Object.keys(yields);
    if (keys.length !== 1 || !['coerce', 'lost'].includes(keys[0])) {
      throw new Error(`correspondence: ${where} yields ${keys.join(', ')}; expected one of coerce, lost`);
    }
    if (yields.coerce && !COERCIONS[yields.coerce]) {
      throw new Error(`correspondence: ${where} names coercion '${yields.coerce}', which does not exist`);
    }
  });
};

/**
 * Whether the call's parentheses are dropped or added, from the two sides' kinds. A member
 * that is a method on one side and a plain property on the other changes arity along with
 * its name: `res.json()` -> `res.data` drops the call, `res.data` -> `res.json()` adds one.
 */
const deriveCall = (row, from) => {
  const fromKind = row[from === 'pm' ? 'pmKind' : 'bruKind'];
  const toKind = row[from === 'pm' ? 'bruKind' : 'pmKind'];

  if (fromKind === toKind) return null;
  if (fromKind === 'method' && toKind === 'property') return 'drop';
  if (fromKind === 'property' && toKind === 'method') return 'add';
  return null;
};

const resolveHandlers = (handlers, correspondence, sideKey) =>
  Object.fromEntries(
    Object.entries(handlers).map(([kind, positions]) => [
      kind,
      positions.map((pairName) => (pairName ? correspondence.typePairs[pairName][sideKey] : null))
    ])
  );

/**
 * Turns a type pair's rows into the member map for one direction, dropping the rows that
 * do not apply to it.
 */
const deriveMembers = (pair, { from, to, directionKey, direction }) => {
  const members = {};

  pair.members.forEach((row) => {
    validateRow(row, pair[from === 'pm' ? 'postman' : 'bruno']);

    const name = row[from];
    if (!name) return;

    if (row.unsupported) {
      members[name] = { unsupported: row.unsupported };
      return;
    }

    if (row.direction && row.direction !== direction) return;

    const spec = { to: row[to] };

    const call = deriveCall(row, from);
    if (call) spec.call = call;

    if (row[directionKey]) spec.yields = row[directionKey];

    members[name] = spec;
  });

  return members;
};

/**
 * Builds a one-direction registry from the bidirectional correspondence table.
 *
 * The engine reads a registry, never the correspondence: each direction wants the names of
 * the side it is translating *from* as keys. Deriving both sides from one table is what
 * keeps them inverses — nothing here can produce a mapping the other direction lacks.
 *
 * @param {Object} correspondence - The table from correspondence.js
 * @param {'pm'|'bru'} from - Side being translated from
 * @returns {{producers: Object, params: Object, types: Object}}
 */
const derive = (correspondence, from) => {
  const to = from === 'pm' ? 'bru' : 'pm';
  const sideKey = from === 'pm' ? 'postman' : 'bruno';
  const directionKey = from === 'pm' ? 'pmToBru' : 'bruToPm';
  const direction = `${from}->${to}`;

  const types = {};
  Object.values(correspondence.typePairs).forEach((pair) => {
    types[pair[sideKey]] = deriveMembers(pair, { from, to, directionKey, direction });
  });

  const producers = {};
  const params = {};
  correspondence.entryPoints.forEach((entry) => {
    const typeName = correspondence.typePairs[entry.yields][sideKey];

    producers[entry[from]] = typeName;
    if (entry.bothSpellings) producers[entry[to]] = typeName;

    if (entry.handlers) {
      params[entry[from]] = resolveHandlers(entry.handlers, correspondence, sideKey);
    }
  });

  return { producers, params, types };
};

export default derive;
