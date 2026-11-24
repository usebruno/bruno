import { describe, it, expect } from '@jest/globals';
import { fromOpenCollectionHttpItem, toOpenCollectionHttpItem } from '../../src/opencollection/items/http';

const httpRequest = {
  info: { name: 'Get users', type: 'http', seq: 1 },
  http: { method: 'GET', url: 'https://example.com' }
};

const brunoRequest = {
  name: 'Get users',
  type: 'http-request',
  seq: 1,
  request: { method: 'GET', url: 'https://example.com' }
};

describe('fromOpenCollectionHttpItem omitHeaders', () => {
  it('copies a non-empty omitHeaders list onto Bruno settings', () => {
    const item = fromOpenCollectionHttpItem({
      ...httpRequest,
      settings: { omitHeaders: ['Accept', 'User-Agent'] }
    });

    expect(item.settings.omitHeaders).toEqual(['Accept', 'User-Agent']);
  });

  it('leaves omitHeaders unset when the list is missing, empty, or not an array', () => {
    const missing = fromOpenCollectionHttpItem({
      ...httpRequest,
      settings: { encodeUrl: true }
    });
    const empty = fromOpenCollectionHttpItem({
      ...httpRequest,
      settings: { omitHeaders: [] }
    });
    const invalid = fromOpenCollectionHttpItem({
      ...httpRequest,
      settings: { omitHeaders: 'Accept' }
    });

    expect(missing.settings).not.toHaveProperty('omitHeaders');
    expect(empty.settings).not.toHaveProperty('omitHeaders');
    expect(invalid.settings).not.toHaveProperty('omitHeaders');
  });
});

describe('toOpenCollectionHttpItem omitHeaders', () => {
  it('copies a non-empty omitHeaders list onto OpenCollection settings', () => {
    const ocRequest = toOpenCollectionHttpItem({
      ...brunoRequest,
      settings: { omitHeaders: ['Accept', 'User-Agent'] }
    });

    expect(ocRequest.settings.omitHeaders).toEqual(['Accept', 'User-Agent']);
  });

  it('leaves omitHeaders unset when the list is missing, empty, or not an array', () => {
    const missing = toOpenCollectionHttpItem({
      ...brunoRequest,
      settings: { encodeUrl: false }
    });
    const empty = toOpenCollectionHttpItem({
      ...brunoRequest,
      settings: { omitHeaders: [] }
    });
    const invalid = toOpenCollectionHttpItem({
      ...brunoRequest,
      settings: { omitHeaders: 'User-Agent' }
    });

    expect(missing.settings).not.toHaveProperty('omitHeaders');
    expect(empty.settings).not.toHaveProperty('omitHeaders');
    expect(invalid.settings).not.toHaveProperty('omitHeaders');
  });
});

describe('omitHeaders round trip', () => {
  it('keeps disabled default headers when converting Bruno to OpenCollection and back', () => {
    const exported = toOpenCollectionHttpItem({
      ...brunoRequest,
      settings: { omitHeaders: ['Accept', 'User-Agent'] }
    });
    const imported = fromOpenCollectionHttpItem(exported);

    expect(imported.settings.omitHeaders).toEqual(['Accept', 'User-Agent']);
  });
});
