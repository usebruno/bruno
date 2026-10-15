import { POSTMAN_REGISTRY, BRUNO_REGISTRY } from '../../src/utils/semantic';
import CORRESPONDENCE from '../../src/utils/semantic/correspondence';
import derive from '../../src/utils/semantic/derive';

/**
 * Both registries are derived from one correspondence table, so a one-sided or mis-polarised
 * mapping is no longer possible to write — the mirror tests that used to live here are now
 * assertions about `derive` itself rather than about two hand-written files agreeing.
 *
 * What is still worth pinning: the derivation really does invert, the vocabulary stays
 * within what the engine implements, and a malformed row fails loudly instead of silently
 * dropping a member.
 */

const INVERSE_CALL = { drop: 'add', add: 'drop', undefined: undefined };

const TYPE_PAIRS = Object.fromEntries(
  Object.values(CORRESPONDENCE.typePairs).map((pair) => [pair.postman, pair.bruno])
);

describe('semantic registries', () => {
  describe('derivation', () => {
    it('should pair every declared type', () => {
      expect(Object.keys(POSTMAN_REGISTRY.types).sort()).toEqual(Object.keys(TYPE_PAIRS).sort());
      expect(Object.keys(BRUNO_REGISTRY.types).sort()).toEqual(Object.values(TYPE_PAIRS).sort());
    });

    it.each(Object.entries(TYPE_PAIRS))('should invert %s onto %s', (postmanType, brunoType) => {
      const back = BRUNO_REGISTRY.types[brunoType];

      Object.entries(POSTMAN_REGISTRY.types[postmanType]).forEach(([member, spec]) => {
        // a member with no counterpart has nothing to invert, by declaration
        if (spec.unsupported) return;

        const where = `${postmanType}.${member} -> ${spec.to}`;
        const inverse = back[spec.to];

        expect([where, Boolean(inverse)]).toEqual([where, true]);

        // `text` and `json` both map onto `data`, so only one of them has a way back
        if (inverse.to !== member) {
          const row = findRow(postmanType, member);
          expect([where, row.direction]).toEqual([where, 'pm->bru']);
          return;
        }

        expect([where, inverse.call]).toEqual([where, INVERSE_CALL[spec.call]]);
      });
    });

    it('should only name types it declares', () => {
      [POSTMAN_REGISTRY, BRUNO_REGISTRY].forEach((registry) => {
        const referenced = [
          ...Object.values(registry.producers),
          ...Object.values(registry.params).flatMap((byKind) => Object.values(byKind).flat())
        ].filter(Boolean);

        expect(referenced.filter((type) => !registry.types[type])).toEqual([]);
      });
    });

    // The vocabulary is narrow on purpose: an entry stays safe to add without reading the
    // engine only while it cannot say anything the engine does not implement.
    const VERDICT_KEYS = ['to', 'call', 'yields', 'unsupported'];

    it('should describe members only in the vocabulary the engine implements', () => {
      const malformed = eachMember(([where, spec]) => {
        const keys = Object.keys(spec);
        if (keys.some((key) => !VERDICT_KEYS.includes(key))) return where;
        if (spec.unsupported) return keys.length === 1 ? null : where;
        if (typeof spec.to !== 'string') return where;
        if ('call' in spec && !['drop', 'add'].includes(spec.call)) return where;
        return null;
      });

      expect(malformed).toEqual([]);
    });
  });

  // a new collision is only distinguishable by its console warning, so it needs a human look
  it('should collide with a rename target only where we know about it', () => {
    const collisions = [POSTMAN_REGISTRY, BRUNO_REGISTRY].flatMap((registry) =>
      Object.entries(registry.types).flatMap(([typeName, members]) => {
        const renamedOnto = new Set(Object.values(members).map((spec) => spec.to).filter(Boolean));

        return Object.entries(members)
          .filter(([name, spec]) => spec.unsupported && renamedOnto.has(name))
          .map(([name]) => `${typeName}.${name}`);
      })
    );

    expect(collisions).toEqual(['BrunoCookieJar.clear']);
  });

  describe('a malformed row', () => {
    const deriveWith = (row) =>
      () => derive({ typePairs: { T: { postman: 'P', bruno: 'B', members: [row] } }, entryPoints: [] }, 'pm');

    it('should be rejected when it names no member', () => {
      expect(deriveWith({ unsupported: 'why' })).toThrow(/names no member/);
    });

    it('should be rejected when one-sided without a reason', () => {
      expect(deriveWith({ bru: 'onlyHere' })).toThrow(/must say why it is unsupported/);
    });

    it('should be rejected when paired and marked unsupported', () => {
      expect(deriveWith({ pm: 'a', bru: 'b', unsupported: 'why' })).toThrow(/paired and marked unsupported/);
    });

    it('should be rejected when it gives one kind without the other', () => {
      expect(deriveWith({ pm: 'a', bru: 'b', pmKind: 'method' })).toThrow(/without the other/);
    });

    it('should be rejected when differs is paired with anything else', () => {
      expect(deriveWith({ pm: 'a', bru: 'b', yields: { differs: 'x', type: 'T' } }))
        .toThrow(/differs stands alone/);
    });

    it('should be rejected when it projects on both sides', () => {
      expect(deriveWith({ pm: 'a', bru: 'b', yields: { type: 'T', pmProjects: 'x', bruProjects: 'y' } }))
        .toThrow(/projects on both sides/);
    });

    it('should be rejected when a projection names no type pair to project from', () => {
      expect(deriveWith({ pm: 'a', bru: 'b', yields: { pmProjects: 'x' } }))
        .toThrow(/without a type/);
    });

    it('should be rejected when it projects a member the pair does not declare', () => {
      expect(deriveWith({ pm: 'a', bru: 'b', yields: { type: 'T', pmProjects: 'nope' } }))
        .toThrow(/declares no pm member for/);
    });

    it('should be rejected when its yield says something the engine cannot act on', () => {
      expect(deriveWith({ pm: 'a', bru: 'b', yields: { wrapped: true } })).toThrow(/expected only/);
    });

    it('should be rejected when it yields a type pair that is not declared', () => {
      expect(deriveWith({ pm: 'a', bru: 'b', yields: { type: 'Nope' } })).toThrow(/not a declared type pair/);
    });

    /**
     * No row in the live table yields a type today, so the engine's support for it is pinned
     * here rather than through `correspondence.js`.
     */
    it('should resolve a yielded type pair to the name of the side being derived', () => {
      const table = {
        typePairs: {
          T: { postman: 'P', bruno: 'B', members: [{ pm: 'a', bru: 'b', yields: { type: 'U' } }] },
          U: { postman: 'PU', bruno: 'BU', members: [{ pm: 'c', bru: 'd' }] }
        },
        entryPoints: []
      };

      // one declaration, resolved to each side's own name for the pair
      expect(derive(table, 'pm').types.P.a.yields).toEqual({ type: 'PU' });
      expect(derive(table, 'bru').types.B.b.yields).toEqual({ type: 'BU' });
    });

    it('should derive a projection one way and a generated loss the other', () => {
      const table = {
        typePairs: {
          T: { postman: 'P', bruno: 'B', members: [
            { pm: 'get', bru: 'getCookie', yields: { type: 'C', pmProjects: 'val' } }] },
          // the two sides spell the projected member differently on purpose
          C: { postman: 'PC', bruno: 'BC', members: [{ pm: 'val', bru: 'value' }] }
        },
        entryPoints: []
      };

      // named as Postman spells it, appended as Bruno spells it
      expect(derive(table, 'pm').types.P.get.yields).toEqual({ project: 'value' });
      expect(derive(table, 'bru').types.B.getCookie.yields.differs).toMatch(/Postman yields only 'val'/);
    });

    it('should be rejected when two members map onto one name', () => {
      const tableOf = (members) => ({ typePairs: { T: { postman: 'P', bruno: 'B', members } }, entryPoints: [] });
      const colliding = [{ pm: 'json', bru: 'data' }, { pm: 'text', bru: 'data' }];

      expect(() => derive(tableOf(colliding), 'bru')).toThrow(/maps two members onto 'data'/);
      expect(() => derive(tableOf(colliding), 'pm')).not.toThrow();

      const resolved = [{ pm: 'json', bru: 'data' }, { pm: 'text', bru: 'data', direction: 'pm->bru' }];
      expect(() => derive(tableOf(resolved), 'bru')).not.toThrow();
    });
  });
});

const findRow = (postmanType, member) =>
  Object.values(CORRESPONDENCE.typePairs)
    .find((pair) => pair.postman === postmanType)
    .members.find((row) => row.pm === member);

const eachMember = (check) =>
  [POSTMAN_REGISTRY, BRUNO_REGISTRY].flatMap((registry) =>
    Object.entries(registry.types).flatMap(([typeName, members]) =>
      Object.entries(members)
        .map(([name, spec]) => check([`${typeName}.${name}`, spec]))
        .filter(Boolean)
    )
  );
