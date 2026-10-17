const KINDS = ['method', 'property'];
const YIELDS = ['type', 'pmProjects', 'bruProjects', 'differs'];
const SIDE_NAME = { pm: 'Postman', bru: 'Bruno' };
const DIRECTIONS = ['pm->bru', 'bru->pm'];

/**
 * Rejects a `yields` the engine could not act on.
 *
 * A projection names the pair it projects *from*, so the member can be checked and, when
 * derived, resolved to the other side's spelling. Without the pair it would be an unchecked
 * string that reaches the output verbatim.
 */
const validateYields = (yields, where, typePairs) => {
  const keys = Object.keys(yields);

  if (keys.some((key) => !YIELDS.includes(key))) {
    throw new Error(`correspondence: ${where} yields ${keys.join(', ')}; expected only ${YIELDS.join(', ')}`);
  }

  if (yields.pmProjects && yields.bruProjects) {
    throw new Error(`correspondence: ${where} projects on both sides; one of them has to yield the whole value`);
  }

  if (yields.differs) {
    if (keys.length === 1) return;
    throw new Error(`correspondence: ${where} pairs differs with ${keys.filter((key) => key !== 'differs').join(', ')}; differs stands alone`);
  }

  if (!yields.type) {
    throw new Error(`correspondence: ${where} yields ${keys.join(', ')} without a type; a projection names the pair it projects from`);
  }

  const pair = typePairs[yields.type];
  if (!pair) {
    throw new Error(`correspondence: ${where} yields type '${yields.type}', which is not a declared type pair`);
  }

  const side = yields.pmProjects ? 'pm' : 'bru';
  const member = yields[`${side}Projects`];
  if (!member) return;

  const projected = pair.members.find((row) => row[side] === member);

  if (!projected) {
    throw new Error(`correspondence: ${where} projects '${member}', which ${yields.type} declares no ${side} member for`);
  }

  if (!projected.pm || !projected.bru) {
    throw new Error(`correspondence: ${where} projects '${member}', which ${yields.type} pairs with nothing on the other side`);
  }
};

/**
 * Rejects a row the engine could not act on. A malformed row is a mistake in the table
 * rather than a condition to translate around, so it fails at import instead of quietly
 * dropping the member.
 */
const validateRow = (row, typeName, typePairs) => {
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

  if (row.yields) validateYields(row.yields, where, typePairs);
};

/**
 * Turns one bidirectional `yields` into what this direction has to do about it.
 *
 * A projection is the asymmetric case: one side hands back a whole value, the other hands
 * back a single member of it. Translating towards the whole value appends that member;
 * translating away from it cannot rebuild what was never there, so the reason is generated
 * rather than written twice.
 */
const deriveYields = (yields, { from, sideKey, typePairs }) => {
  if (yields.differs) return { differs: yields.differs };

  const pair = typePairs[yields.type];
  const projects = yields.pmProjects ? 'pm' : (yields.bruProjects ? 'bru' : null);

  if (!projects) return { type: pair[sideKey] };

  const member = yields[`${projects}Projects`];

  // translating towards the whole value appends the member, spelled as that side spells it
  if (from === projects) {
    const to = projects === 'pm' ? 'bru' : 'pm';

    return { project: pair.members.find((row) => row[projects] === member)[to] };
  }

  return {
    differs: `${SIDE_NAME[projects]} yields only '${member}', which the whole value cannot be rebuilt from`
  };
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
      positions.map((slot) => (slot ? correspondence.typePairs[slot.type][sideKey] : null))
    ])
  );

/**
 * Turns a type pair's rows into the member map for one direction, dropping the rows that
 * do not apply to it.
 */
const deriveMembers = (pair, { from, to, direction, sideKey, typePairs }) => {
  const typeName = pair[sideKey];
  const members = {};

  /**
   * Two members mapping onto one name leaves this direction no way to choose between them,
   * and the loser would depend on the order of the rows. The row that does not invert has to
   * say so with `direction`.
   */
  const defineMember = (name, spec) => {
    if (members[name]) {
      throw new Error(
        `correspondence: ${typeName} maps two members onto '${name}'; the one that does not invert needs a direction`
      );
    }

    members[name] = spec;
  };

  pair.members.forEach((row) => {
    validateRow(row, typeName, typePairs);

    const name = row[from];
    if (!name) return;

    if (row.unsupported) {
      defineMember(name, { unsupported: row.unsupported });
      return;
    }

    if (row.direction && row.direction !== direction) return;

    const spec = { to: row[to] };

    const call = deriveCall(row, from);
    if (call) spec.call = call;

    if (row.yields) spec.yields = deriveYields(row.yields, { from, sideKey, typePairs });

    defineMember(name, spec);
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
/**
 * Rejects a slot that should name a type and does not. A producer and a handler parameter each
 * have only one side, so the vocabulary a member row uses to relate *two* of them cannot apply —
 * the object shape is shared for consistency, the vocabulary is not.
 */
const validateYieldedType = (yields, where, typePairs) => {
  const keys = Object.keys(yields || {});

  if (keys.length !== 1 || keys[0] !== 'type') {
    throw new Error(`correspondence: ${where} yields ${keys.join(', ') || 'nothing'}; expected a type`);
  }

  if (!typePairs[yields.type]) {
    throw new Error(`correspondence: ${where} yields type '${yields.type}', which is not a declared type pair`);
  }
};

const validateEntryPoint = (entry, typePairs) => {
  const where = `entry point ${entry.pm || entry.bru}`;

  validateYieldedType(entry.yields, where, typePairs);

  Object.entries(entry.handlers || {}).forEach(([kind, positions]) => {
    positions.forEach((slot, index) => {
      if (slot) validateYieldedType(slot, `${where} ${kind}[${index}]`, typePairs);
    });
  });
};

const derive = (correspondence, from) => {
  const to = from === 'pm' ? 'bru' : 'pm';
  const sideKey = from === 'pm' ? 'postman' : 'bruno';
  const direction = `${from}->${to}`;

  const types = {};
  Object.values(correspondence.typePairs).forEach((pair) => {
    types[pair[sideKey]] = deriveMembers(pair, {
      from, to, direction, sideKey, typePairs: correspondence.typePairs
    });
  });

  const producers = {};
  const params = {};
  correspondence.entryPoints.forEach((entry) => {
    validateEntryPoint(entry, correspondence.typePairs);

    const typeName = correspondence.typePairs[entry.yields.type][sideKey];

    producers[entry[from]] = typeName;
    if (entry.bothSpellings) producers[entry[to]] = typeName;

    if (entry.handlers) {
      params[entry[from]] = resolveHandlers(entry.handlers, correspondence, sideKey);
    }
  });

  return { producers, params, types };
};

export default derive;
