import { describe, it, expect } from '@jest/globals';
import insomniaToBruno from '../../src/insomnia/insomnia-to-bruno';

// Regression test for case-insensitive name collisions on import. See the matching
// Postman spec for the full rationale.
describe('insomnia converter — sibling name deduplication', () => {
  it('dedupes case-only folder-name collisions at the same parent', () => {
    const collection = {
      _type: 'export',
      __export_format: 4,
      resources: [
        { _id: 'wrk_1', _type: 'workspace', name: 'dedupe', parentId: null },
        { _id: 'fld_1', _type: 'request_group', parentId: 'wrk_1', name: 'OAuth2' },
        { _id: 'fld_2', _type: 'request_group', parentId: 'wrk_1', name: 'oAuth2' }
      ]
    };

    const bruno = insomniaToBruno(collection);
    const names = bruno.items.filter((i) => i.type === 'folder').map((i) => i.name);

    expect(names).toHaveLength(2);
    expect(names[0]).toBe('OAuth2');
    expect(names[1]).toBe('oAuth2_1');
  });

  it('dedupes case-only request-name collisions at the same parent', () => {
    const collection = {
      _type: 'export',
      __export_format: 4,
      resources: [
        { _id: 'wrk_1', _type: 'workspace', name: 'dedupe', parentId: null },
        {
          _id: 'req_1',
          _type: 'request',
          parentId: 'wrk_1',
          name: 'GetUser',
          method: 'GET',
          url: 'https://example.com/a'
        },
        {
          _id: 'req_2',
          _type: 'request',
          parentId: 'wrk_1',
          name: 'getuser',
          method: 'GET',
          url: 'https://example.com/b'
        }
      ]
    };

    const bruno = insomniaToBruno(collection);
    const names = bruno.items.filter((i) => i.type === 'http-request').map((i) => i.name);

    expect(names).toHaveLength(2);
    expect(names[0]).toBe('GetUser');
    expect(names[1]).toBe('getuser_1');
  });
});
