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

  it.each([-1, 3.5, '100', 'abc', '', true, [], NaN, Infinity, null])(
    'should drop a maxRedirects of %p and warn instead of failing the import',
    async (maxRedirects) => {
      const { settings, issues } = await importPostmanRequestWithMaxRedirects(maxRedirects);

      expect(settings).not.toHaveProperty('maxRedirects');
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        path: 'Req',
        severity: 'warning',
        message: 'Invalid maxRedirects, ignored (must be a whole number of 0 or more)'
      });
    }
  );

  it.each(['1e309', '-1e309', `1${'0'.repeat(400)}`])(
    'should warn for a maxRedirects literal of %s that overflows to a non-finite number',
    async (literal) => {
      const postmanJson = JSON.stringify(makeCollection([makeRequest('Req', { protocolProfileBehavior: {} })]));
      const withOverflow = postmanJson.replace('"protocolProfileBehavior":{}', `"protocolProfileBehavior":{"maxRedirects":${literal}}`);

      const { collection, issues } = await postmanToBruno(JSON.parse(withOverflow));

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
