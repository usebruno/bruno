import { POSTMAN_REGISTRY, BRUNO_REGISTRY } from '../../src/utils/semantic';

/**
 * The two registries describe the same member mappings in opposite directions, and nothing in
 * the engine links them — each is hand-written. These are the invariants that make a one-sided
 * or mis-polarised edit fail here, naming what is wrong, rather than surfacing later as a
 * confusing diff in tests/postman/round-trip/scripts.spec.js.
 */

/** Types naming the same concept on either side. A new type pair must be added here. */
const TYPE_PAIRS = {
  PostmanResponse: 'BrunoResponse',
  PostmanCookieJar: 'BrunoCookieJar'
};

/**
 * Members that deliberately do not round trip, because more than one of them collapses onto a
 * single member of the other API and only one can win the way back.
 */
const ONE_WAY_MEMBERS = [
  {
    type: 'PostmanResponse',
    member: 'text',
    reason: 'text() and json() both map to `data`, which translates back to json()'
  }
];

const INVERSE_CALL = { drop: 'add', add: 'drop' };

const isOneWay = (type, member) =>
  ONE_WAY_MEMBERS.some((entry) => entry.type === type && entry.member === member);

const DIRECTIONS = [
  { label: 'postman', registry: POSTMAN_REGISTRY },
  { label: 'bruno', registry: BRUNO_REGISTRY }
];

describe('semantic registries', () => {
  describe.each(DIRECTIONS)('$label registry', ({ registry }) => {
    const declaredTypes = Object.keys(registry.types);

    const referencedTypes = [
      ...Object.values(registry.producers),
      ...Object.values(registry.params).flatMap((byKind) => Object.values(byKind).flat())
    ].filter(Boolean);

    it('should only name types it declares', () => {
      const unknown = referencedTypes.filter((type) => !registry.types[type]);
      expect(unknown).toEqual([]);
    });

    it('should declare no type the engine cannot reach', () => {
      const unreachable = declaredTypes.filter((type) => !referencedTypes.includes(type));
      expect(unreachable).toEqual([]);
    });

    // The vocabulary is narrow on purpose: an entry stays safe to add without reading the
    // engine only while it cannot say anything the engine does not implement.
    it('should describe members with `to` and `call` alone', () => {
      const malformed = declaredTypes.flatMap((type) =>
        Object.entries(registry.types[type])
          .filter(
            ([, spec]) =>
              typeof spec.to !== 'string'
              || Object.keys(spec).some((key) => key !== 'to' && key !== 'call')
              || ('call' in spec && spec.call !== 'drop' && spec.call !== 'add')
          )
          .map(([member]) => `${type}.${member}`)
      );

      expect(malformed).toEqual([]);
    });
  });

  describe('the two registries as mirrors', () => {
    it('should pair every declared type', () => {
      expect(Object.keys(POSTMAN_REGISTRY.types).sort()).toEqual(Object.keys(TYPE_PAIRS).sort());
      expect(Object.keys(BRUNO_REGISTRY.types).sort()).toEqual(Object.values(TYPE_PAIRS).sort());
    });

    it.each(Object.entries(TYPE_PAIRS))('should mirror %s onto %s', (postmanType, brunoType) => {
      const forward = POSTMAN_REGISTRY.types[postmanType];
      const back = BRUNO_REGISTRY.types[brunoType];

      Object.entries(forward).forEach(([member, spec]) => {
        const where = `${postmanType}.${member} -> ${spec.to}`;
        const inverse = back[spec.to];

        // a member may collapse onto another, but it must never point at nothing
        expect([where, Boolean(inverse)]).toEqual([where, true]);

        if (isOneWay(postmanType, member)) {
          // a one-way member that starts round tripping should lose its exemption
          expect([where, inverse.to]).not.toEqual([where, member]);
          return;
        }

        expect([where, inverse.to]).toEqual([where, member]);
        expect([where, inverse.call]).toEqual([where, INVERSE_CALL[spec.call]]);
      });
    });

    it('should mirror back every member the reverse direction declares', () => {
      Object.entries(TYPE_PAIRS).forEach(([postmanType, brunoType]) => {
        Object.entries(BRUNO_REGISTRY.types[brunoType]).forEach(([member, spec]) => {
          const where = `${brunoType}.${member} -> ${spec.to}`;
          const inverse = POSTMAN_REGISTRY.types[postmanType][spec.to];

          expect([where, Boolean(inverse)]).toEqual([where, true]);
          expect([where, inverse.to]).toEqual([where, member]);
          expect([where, inverse.call]).toEqual([where, INVERSE_CALL[spec.call]]);
        });
      });
    });

    it('should exempt only members that exist', () => {
      const stale = ONE_WAY_MEMBERS.filter(({ type, member }) => {
        const types = POSTMAN_REGISTRY.types[type] || BRUNO_REGISTRY.types[type];
        return !types || !types[member];
      });

      expect(stale).toEqual([]);
    });
  });
});
