import { getEffectiveTabOrder } from './index';

describe('getEffectiveTabOrder', () => {
  const preferences = {
    requestTabOrder: {
      http: ['params', 'body', 'headers'],
      graphql: ['query', 'variables']
    },
    requestTabOrderPersistenceScope: 'global'
  };

  const collection = {
    uid: 'coll-1',
    requestTabOrder: ['headers', 'params'],
    items: [
      {
        uid: 'folder-1',
        type: 'folder',
        requestTabOrder: ['docs', 'vars'],
        items: [
          {
            uid: 'item-1',
            type: 'http-request',
            requestTabOrder: ['body', 'params']
          }
        ]
      }
    ]
  };

  const item = collection.items[0].items[0];

  it('should return global tab order when scope is global', () => {
    const result = getEffectiveTabOrder(item, collection, preferences);
    expect(result).toEqual(['params', 'body', 'headers']);
  });

  it('should return collection tab order when scope is collection', () => {
    const prefs = { ...preferences, requestTabOrderPersistenceScope: 'collection' };
    const result = getEffectiveTabOrder(item, collection, prefs);
    expect(result).toEqual(['headers', 'params']);
  });

  it('should return request tab order when scope is request', () => {
    const prefs = { ...preferences, requestTabOrderPersistenceScope: 'request' };
    const result = getEffectiveTabOrder(item, collection, prefs);
    expect(result).toEqual(['body', 'params']);
  });

  it('should return folder tab order when scope is folder', () => {
    const prefs = { ...preferences, requestTabOrderPersistenceScope: 'folder' };
    const result = getEffectiveTabOrder(item, collection, prefs);
    expect(result).toEqual(['docs', 'vars']);
  });

  it('should fallback to collection when scope is folder but request is at root', () => {
    const prefs = { ...preferences, requestTabOrderPersistenceScope: 'folder' };
    const rootItem = { uid: 'root-item-1', type: 'http-request' };
    const result = getEffectiveTabOrder(rootItem, collection, prefs);
    expect(result).toEqual(['headers', 'params']);
  });

  it('should fallback to global if scope is unknown', () => {
    const prefs = { ...preferences, requestTabOrderPersistenceScope: 'invalid' };
    const result = getEffectiveTabOrder(item, collection, prefs);
    expect(result).toEqual(['params', 'body', 'headers']);
  });

  it('should handle different request types', () => {
    const gqlItem = { type: 'graphql-request', uid: 'gql-1' };
    const result = getEffectiveTabOrder(gqlItem, collection, preferences);
    expect(result).toEqual(['query', 'variables']);
  });
});
