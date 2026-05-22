import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../../src/postman/postman-to-bruno';

// Regression test for collisions on case-insensitive filesystems (macOS APFS/HFS+,
// Windows NTFS). Prior to this fix, a Postman collection with siblings like
// `OAuth2` and `oAuth2` (or two identically-named `Returns` folders) would silently
// overwrite each other on disk — or crash with EEXIST on import paths that used
// a non-recursive mkdir.
describe('postman converter — sibling name deduplication', () => {
  const buildFolder = (name) => ({
    name,
    item: [
      {
        name: `${name} request`,
        request: { method: 'GET', url: 'https://example.com' }
      }
    ]
  });

  const collectionWith = (folderNames) => ({
    info: {
      _postman_id: 'dedupe-test',
      name: 'dedupe',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: folderNames.map(buildFolder)
  });

  it('dedupes exact-duplicate sibling folder names', async () => {
    const result = await postmanToBruno(collectionWith(['Returns', 'Returns']));
    const names = result.items.map((i) => i.name);
    expect(names).toEqual(['Returns', 'Returns_1']);
  });

  it('dedupes case-only collisions so disk paths never overlap', async () => {
    const result = await postmanToBruno(collectionWith(['OAuth2', 'oAuth2']));
    const names = result.items.map((i) => i.name);
    // Both names survive; the second gets a suffix since it collides case-insensitively.
    expect(names[0]).toBe('OAuth2');
    expect(names[1]).toBe('oAuth2_1');
    expect(names[0].toLowerCase()).not.toBe(names[1].toLowerCase());
  });

  it('dedupes case-insensitive request-name collisions', async () => {
    const collection = {
      info: {
        _postman_id: 'dedupe-req',
        name: 'dedupe',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        { name: 'GetUser', request: { method: 'GET', url: 'https://example.com/a' } },
        { name: 'getuser', request: { method: 'GET', url: 'https://example.com/b' } }
      ]
    };
    const result = await postmanToBruno(collection);
    const names = result.items.map((i) => i.name);
    expect(names[0]).toBe('GetUser');
    expect(names[1]).toBe('getuser_1');
  });
});
