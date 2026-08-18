import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../../src/postman/postman-to-bruno';
import { makeCollection, makeRequest } from '../../common/postman-collection';

const importPostmanRequestWithMaxRedirects = async (maxRedirects) => {
  const { collection, issues } = await postmanToBruno(
    makeCollection([makeRequest('Req', { protocolProfileBehavior: { maxRedirects } })])
  );
  return { settings: collection.items[0].settings, issues };
};

describe('postman maxRedirects import', () => {
  it.each([0, 50, 51, 1000, Number.MAX_SAFE_INTEGER, 1e21, 9.999999999998865e21])(
    'should preserve a maxRedirects of %p',
    async (maxRedirects) => {
      const { settings, issues } = await importPostmanRequestWithMaxRedirects(maxRedirects);

      expect(settings.maxRedirects).toBe(maxRedirects);
      expect(issues).toHaveLength(0);
    }
  );

  it.each([{ followRedirects: true }, undefined])(
    'should leave maxRedirects unset for protocolProfileBehavior %p',
    async (protocolProfileBehavior) => {
      const { collection, issues } = await postmanToBruno(
        makeCollection([makeRequest('Req', { protocolProfileBehavior })])
      );

      expect(collection.items[0].settings).not.toHaveProperty('maxRedirects');
      expect(issues).toHaveLength(0);
    }
  );

  it.each([
    [3.5, 3],
    [0.9, 0]
  ])('should truncate a fractional maxRedirects of %p to %p', async (maxRedirects, truncated) => {
    const { settings, issues } = await importPostmanRequestWithMaxRedirects(maxRedirects);

    expect(settings.maxRedirects).toBe(truncated);
    expect(issues).toHaveLength(0);
  });

  it.each([-1, '100', 'abc', '', true, [], NaN, Infinity, null])(
    'should drop a maxRedirects of %p and warn instead of failing the import',
    async (maxRedirects) => {
      const { settings, issues } = await importPostmanRequestWithMaxRedirects(maxRedirects);

      expect(settings).not.toHaveProperty('maxRedirects');
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        path: 'Req',
        severity: 'warning',
        message: 'Invalid maxRedirects, ignored (must be a number of 0 or more)'
      });
      expect(issues[0]).not.toHaveProperty('sourceItem');
    }
  );

  // An overflowing numeric literal cannot be expressed as a JS number (1e309 is already Infinity),
  // so the exported document is stated as text and read the way a real export file would be.
  const postmanJsonWithMaxRedirectsLiteral = (literal) => `{
    "info": {
      "_postman_id": "test-id",
      "name": "Test Collection",
      "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "item": [
      {
        "name": "Req",
        "protocolProfileBehavior": { "maxRedirects": ${literal} },
        "request": {
          "method": "GET",
          "header": [],
          "url": { "raw": "https://example.com", "protocol": "https", "host": ["example", "com"] }
        }
      }
    ]
  }`;

  it.each(['1e309', '-1e309', `1${'0'.repeat(400)}`])(
    'should warn for a maxRedirects literal of %s that overflows to a non-finite number',
    async (literal) => {
      const { collection, issues } = await postmanToBruno(JSON.parse(postmanJsonWithMaxRedirectsLiteral(literal)));

      expect(collection.items[0].settings).not.toHaveProperty('maxRedirects');
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('warning');
    }
  );

  it('should import every sibling and report one issue per offending request', async () => {
    const { collection, issues } = await postmanToBruno(
      makeCollection([
        makeRequest('First Offender', { protocolProfileBehavior: { maxRedirects: -1 } }),
        makeRequest('Fine', { protocolProfileBehavior: { maxRedirects: 10 } }),
        makeRequest('Second Offender', { protocolProfileBehavior: { maxRedirects: 'nope' } })
      ])
    );

    expect(collection.items.map((item) => item.name)).toEqual(['First Offender', 'Fine', 'Second Offender']);
    expect(issues.map((issue) => issue.path)).toEqual(['First Offender', 'Second Offender']);
  });
});
