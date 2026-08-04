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
    tests: '',
    settings: { maxRedirects }
  },
  settings: { maxRedirects }
});

// A number is serialized by Bruno; a string is spliced in as raw text, for values Bruno would never
// write (.inf, blank, quoted). Assert on `stored` when a value must survive verbatim, since bru
// omits a setting it will not honour and `effective` would hide that behind the runtime's `?? 5`.
const roundTripRequest = (maxRedirects: number | string, format: CollectionFormat) => {
  const seed = typeof maxRedirects === 'number' ? maxRedirects : DEFAULT_MAX_REDIRECTS;
  let text = stringifyRequest(requestWithMaxRedirects(seed) as any, { format });
  if (typeof maxRedirects === 'string') {
    text = text.replace(`maxRedirects: ${seed}`, `maxRedirects: ${maxRedirects}`);
  }
  const stored = parseRequest(text, { format }).settings.maxRedirects;
  return { stored, effective: stored ?? DEFAULT_MAX_REDIRECTS };
};

describe('maxRedirects on-disk round trip', () => {
  describe.each(FORMATS)('%s format', (format) => {
    it.each([0, 5, 50, 51, 1000, Number.MAX_SAFE_INTEGER])(
      'preserves a maxRedirects of %p',
      (maxRedirects) => {
        expect(roundTripRequest(maxRedirects, format).stored).toBe(maxRedirects);
      }
    );

    // parseInt stops at the exponent, so a ceiling Bruno writes as 1e+31 reads back as 1.
    it.each([1e21, 1e31, 9.999999999998865e21])(
      'preserves an exponentially serialized maxRedirects of %p',
      (maxRedirects) => {
        expect(roundTripRequest(maxRedirects, format).stored).toBe(maxRedirects);
      }
    );

    it.each(['1e309', '-1e309', '1' + '0'.repeat(400)])(
      'falls back to the default for an on-disk %s that overflows to a non-finite number',
      (rawValue) => {
        expect(roundTripRequest(rawValue, format).effective).toBe(DEFAULT_MAX_REDIRECTS);
      }
    );

    it('clamps an on-disk value beyond MAX_SAFE_INTEGER to the nearest representable integer', () => {
      expect(roundTripRequest('9007199254740993', format).effective).toBe(9007199254740992);
    });

    it.each(['', ' ', '   '])('leaves the default in place for a blank on-disk value %p', (rawValue) => {
      expect(roundTripRequest(rawValue, format).effective).toBe(DEFAULT_MAX_REDIRECTS);
    });

    it.each(['-1', '-3', '-0.5'])('ignores a negative on-disk value of %s', (rawValue) => {
      expect(roundTripRequest(rawValue, format).effective).toBe(DEFAULT_MAX_REDIRECTS);
    });
  });

  // The formats agree on the enforced ceiling but not on what they store: bru omits a setting it
  // will not honour, yml writes the default in its place. So copying a request from a bru collection
  // into a yml one adds a maxRedirects the author never set.
  it('stores an unusable value differently per format, while enforcing the same ceiling', () => {
    expect(roundTripRequest('abc', 'bru').stored).toBeUndefined();
    expect(roundTripRequest('abc', 'yml').stored).toBe(DEFAULT_MAX_REDIRECTS);
    expect(roundTripRequest('abc', 'bru').effective).toBe(roundTripRequest('abc', 'yml').effective);
  });

  it('agrees between bru and yml on a large value', () => {
    expect(roundTripRequest(1000, 'bru').stored).toBe(roundTripRequest(1000, 'yml').stored);
  });

  it('truncates a fractional maxRedirects identically in both formats', () => {
    expect(roundTripRequest(3.5, 'bru').stored).toBe(3);
    expect(roundTripRequest(3.5, 'yml').stored).toBe(3);
  });

  it.each(['Infinity', '-Infinity', 'NaN'])('ignores a hand-edited bru maxRedirects of %s', (rawValue) => {
    expect(roundTripRequest(rawValue, 'bru').effective).toBe(DEFAULT_MAX_REDIRECTS);
  });

  it.each(['.inf', '-.inf', '.nan'])('ignores a hand-edited yml maxRedirects of %s', (rawValue) => {
    expect(roundTripRequest(rawValue, 'yml').effective).toBe(DEFAULT_MAX_REDIRECTS);
  });

  it('does not honour a quoted yml count, but reads a plain count in both formats', () => {
    expect(roundTripRequest('"10"', 'yml').effective).toBe(DEFAULT_MAX_REDIRECTS);
    expect(roundTripRequest('10', 'yml').effective).toBe(10);
    expect(roundTripRequest('10', 'bru').effective).toBe(10);
  });
});
