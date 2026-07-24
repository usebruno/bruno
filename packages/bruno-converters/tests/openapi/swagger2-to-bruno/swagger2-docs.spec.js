import { describe, it, expect } from '@jest/globals';
import swagger2ToBruno from '../../../src/openapi/swagger2-to-bruno';

const findRequestByName = (items, name) => {
  for (const item of items) {
    if (item.type === 'http-request' && item.name === name) return item;
    if (item.type === 'folder' && item.items) {
      const found = findRequestByName(item.items, name);
      if (found) return found;
    }
  }
  return undefined;
};

const findFolderByName = (items, name) => {
  for (const item of items) {
    if (item.type === 'folder' && item.name === name) return item;
    if (item.type === 'folder' && item.items) {
      const found = findFolderByName(item.items, name);
      if (found) return found;
    }
  }
  return undefined;
};

const buildSpec = (overrides = {}) => ({
  swagger: '2.0',
  info: {
    title: 'Petstore',
    description: '# Pet Store API\n\nThis is the **collection-level** description.',
    ...overrides.info
  },
  tags: overrides.tags ?? [
    { name: 'pets', description: 'Everything about your _Pets_.' },
    { name: 'store', description: '## Store\n\nAccess to Petstore **orders**.' }
  ],
  host: 'api.example.com',
  basePath: '/v1',
  schemes: ['https'],
  paths: {
    '/pets': {
      get: {
        tags: ['pets'],
        summary: 'List pets',
        description: 'Returns all pets.',
        responses: { 200: { description: 'OK' } }
      }
    },
    '/store/orders': {
      post: {
        tags: ['store'],
        summary: 'Place order',
        responses: { 201: { description: 'Created' } }
      }
    }
  }
});

describe('Swagger 2.0 Import - Docs (collection & folder descriptions)', () => {
  it('populates collection Docs from info.description', () => {
    const result = swagger2ToBruno(buildSpec());
    expect(result.root.docs).toBe('# Pet Store API\n\nThis is the **collection-level** description.');
  });

  it('populates each folder Docs from the matching top-level tags[] description', () => {
    const result = swagger2ToBruno(buildSpec());

    const petsFolder = findFolderByName(result.items, 'pets');
    expect(petsFolder.root.docs).toBe('Everything about your _Pets_.');

    const storeFolder = findFolderByName(result.items, 'store');
    expect(storeFolder.root.docs).toBe('## Store\n\nAccess to Petstore **orders**.');
  });

  it('does not regress request-level Docs', () => {
    const result = swagger2ToBruno(buildSpec());
    const request = findRequestByName(result.items, 'List pets');
    expect(request.request.docs).toBe('Returns all pets.');
  });

  it('leaves docs unset when the spec has no info.description or tag descriptions', () => {
    const result = swagger2ToBruno(
      buildSpec({ info: { title: 'No Docs', description: undefined }, tags: [{ name: 'pets' }] })
    );
    expect(result.root.docs == null || result.root.docs === '').toBe(true);
    const petsFolder = findFolderByName(result.items, 'pets');
    expect(petsFolder.root.docs).toBeUndefined();
  });
});
