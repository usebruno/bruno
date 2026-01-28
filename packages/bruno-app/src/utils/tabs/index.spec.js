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
    requestTabOrder: ['headers', 'params']
  };

  const item = {
    uid: 'item-1',
    type: 'http-request',
    requestTabOrder: ['body', 'params']
  };

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
    // In folder scope, the item passed to getEffectiveTabOrder is expected to be the folder (or item with folder's tab order)
    const folderItem = {
      type: 'folder',
      requestTabOrder: ['docs', 'vars']
    };
    const result = getEffectiveTabOrder(folderItem, collection, prefs);
    expect(result).toEqual(['docs', 'vars']);
  });

  it('should fallback to global if scope is unknown', () => {
    const prefs = { ...preferences, requestTabOrderPersistenceScope: 'invalid' };
    const result = getEffectiveTabOrder(item, collection, prefs);
    expect(result).toEqual(['params', 'body', 'headers']);
  });

  it('should handle different request types', () => {
    const gqlItem = { type: 'graphql-request' };
    const result = getEffectiveTabOrder(gqlItem, collection, preferences);
    expect(result).toEqual(['query', 'variables']);
  });
});
