import { isPostmanCollection } from './postman-collection';

const V21_SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

describe('isPostmanCollection', () => {
  it('accepts a v2.1 collection', () => {
    expect(isPostmanCollection({ info: { name: 'API', schema: V21_SCHEMA }, item: [] })).toBe(true);
  });

  it('accepts a v2.1 collection wrapped in a collection envelope', () => {
    expect(isPostmanCollection({ collection: { info: { name: 'API', schema: V21_SCHEMA }, item: [] } })).toBe(true);
  });

  it('accepts a v3 collection', () => {
    expect(isPostmanCollection({ name: 'API', $kind: 'collection', items: [] })).toBe(true);
  });

  it('rejects a v3-like object without an items list', () => {
    expect(isPostmanCollection({ name: 'API', $kind: 'collection' })).toBe(false);
  });

  it('rejects an unsupported schema', () => {
    expect(isPostmanCollection({ info: { schema: 'https://schema.getpostman.com/json/collection/v1.0.0/collection.json' } })).toBe(false);
  });

  it('rejects a Bruno collection', () => {
    expect(isPostmanCollection({ name: 'API', version: '1', items: [] })).toBe(false);
  });
});
