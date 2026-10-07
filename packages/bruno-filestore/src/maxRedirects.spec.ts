import { parseRequest, stringifyRequest } from './index';
import { DEFAULT_MAX_REDIRECTS } from '@usebruno/common/utils';
import type { CollectionFormat } from './types';

const FORMATS: CollectionFormat[] = ['bru', 'yml'];

const requestWithMaxRedirects = (maxRedirects: number) => ({
  uid: 'req-uid',
  name: 'Get Users',
  type: 'http-request',
  seq: 1,
  request: {
    url: 'https://restcountries.com/v2/alpha/in',
    method: 'GET',
    headers: [],
    params: [],
    body: { mode: 'none' },
    auth: { mode: 'none' },
    script: {},
    vars: {},
    assertions: [],
    tests: ''
  },
  settings: { maxRedirects }
});

// Serializes with Bruno's own writer and reads back, covering the write side too.
const roundTripRequest = (maxRedirects: number, format: CollectionFormat) =>
  parseRequest(stringifyRequest(requestWithMaxRedirects(maxRedirects) as any, { format }), { format })
    .settings.maxRedirects;

const HAND_EDITED_DOCUMENTS: Record<CollectionFormat, (rawValue: string) => string> = {
  bru: (rawValue) => `meta {
  name: Get Users
  type: http
  seq: 1
}

get {
  url: https://restcountries.com/v2/alpha/in
  body: none
  auth: none
}

settings {
  maxRedirects: ${rawValue}
}
`,
  yml: (rawValue) => `info:
  name: Get Users
  type: http
  seq: 1

http:
  method: GET
  url: https://restcountries.com/v2/alpha/in

settings:
  maxRedirects: ${rawValue}
`
};

// Parses a document stated byte-for-byte, for values Bruno's writer would never produce
// (.inf, blank, quoted). Returns what the parser stored, so assertions can distinguish a
// dropped value from one the parser replaced with the default.
const parseHandEditedValue = (rawValue: string, format: CollectionFormat) =>
  parseRequest(HAND_EDITED_DOCUMENTS[format](rawValue), { format }).settings.maxRedirects;

describe('maxRedirects on-disk round trip', () => {
  describe.each(FORMATS)('%s format', (format) => {
    // The formats agree on the enforced ceiling but not on what they store for an unusable value:
    // bru omits the setting, yml writes the default in its place.
    const storedWhenUnusable = format === 'bru' ? undefined : DEFAULT_MAX_REDIRECTS;

    it.each([0, 5, 50, 51, 1000, Number.MAX_SAFE_INTEGER])(
      'preserves a maxRedirects of %p',
      (maxRedirects) => {
        expect(roundTripRequest(maxRedirects, format)).toBe(maxRedirects);
      }
    );

    // parseInt stops at the exponent, so a ceiling Bruno writes as 1e+31 reads back as 1.
    it.each([1e21, 1e31, 9.999999999998865e21])(
      'preserves an exponentially serialized maxRedirects of %p',
      (maxRedirects) => {
        expect(roundTripRequest(maxRedirects, format)).toBe(maxRedirects);
      }
    );

    // Files written before any change to the writer's number formatting keep these exact bytes,
    // so the literal exponent form must parse regardless of what the writer emits today.
    it.each([
      ['1e+21', 1e21],
      ['9.999999999998865e+21', 9.999999999998865e21]
    ])('reads an on-disk exponent literal %s in full', (rawValue, expected) => {
      expect(parseHandEditedValue(rawValue, format)).toBe(expected);
    });

    it.each(['1e309', '-1e309', '1' + '0'.repeat(400)])(
      'does not store an on-disk %s that overflows to a non-finite number',
      (rawValue) => {
        expect(parseHandEditedValue(rawValue, format)).toBe(storedWhenUnusable);
      }
    );

    it('clamps an on-disk value beyond MAX_SAFE_INTEGER to the nearest representable integer', () => {
      expect(parseHandEditedValue('9007199254740993', format)).toBe(9007199254740992);
    });

    it.each(['', ' ', '   '])('does not store a blank on-disk value %p', (rawValue) => {
      expect(parseHandEditedValue(rawValue, format)).toBe(storedWhenUnusable);
    });

    it.each(['-1', '-3', '-0.5'])('does not store a negative on-disk value of %s', (rawValue) => {
      expect(parseHandEditedValue(rawValue, format)).toBe(storedWhenUnusable);
    });
  });

  // Copying a request from a bru collection into a yml one adds a maxRedirects the author never
  // set, since yml materializes the default where bru left the setting out.
  it('stores an unusable value differently per format', () => {
    expect(parseHandEditedValue('abc', 'bru')).toBeUndefined();
    expect(parseHandEditedValue('abc', 'yml')).toBe(DEFAULT_MAX_REDIRECTS);
  });

  it('truncates a fractional maxRedirects identically in both formats', () => {
    expect(roundTripRequest(3.5, 'bru')).toBe(3);
    expect(roundTripRequest(3.5, 'yml')).toBe(3);
  });

  it.each(['Infinity', '-Infinity', 'NaN'])('does not store a hand-edited bru maxRedirects of %s', (rawValue) => {
    expect(parseHandEditedValue(rawValue, 'bru')).toBeUndefined();
  });

  it.each(['.inf', '-.inf', '.nan'])('replaces a hand-edited yml maxRedirects of %s with the default', (rawValue) => {
    expect(parseHandEditedValue(rawValue, 'yml')).toBe(DEFAULT_MAX_REDIRECTS);
  });

  it('does not honour a quoted yml count, but reads a plain count in both formats', () => {
    expect(parseHandEditedValue('"10"', 'yml')).toBe(DEFAULT_MAX_REDIRECTS);
    expect(parseHandEditedValue('10', 'yml')).toBe(10);
    expect(parseHandEditedValue('10', 'bru')).toBe(10);
  });
});
