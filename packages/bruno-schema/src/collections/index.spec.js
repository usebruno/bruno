const { expect } = require('@jest/globals');
const { uuid } = require('../utils/testUtils');
const { collectionSchema } = require('./index');

describe('Collection Schema Validation', () => {
  it('collection schema must validate successfully - simple collection, no items', async () => {
    const collection = {
      version: '1',
      uid: uuid(),
      name: 'My Collection'
    };

    const isValid = await collectionSchema.validate(collection);
    expect(isValid).toBeTruthy();
  });

  it('collection schema must validate successfully - simple collection, empty items', async () => {
    const collection = {
      version: '1',
      uid: uuid(),
      name: 'My Collection',
      items: []
    };

    const isValid = await collectionSchema.validate(collection);
    expect(isValid).toBeTruthy();
  });

  it('collection schema must validate successfully - simple collection, just a folder item', async () => {
    const collection = {
      version: '1',
      uid: uuid(),
      name: 'My Collection',
      items: [
        {
          uid: uuid(),
          name: 'A Folder',
          type: 'folder'
        }
      ]
    };

    const isValid = await collectionSchema.validate(collection);
    expect(isValid).toBeTruthy();
  });

  it('collection schema must validate successfully - simple collection, just a request item', async () => {
    const collection = {
      version: '1',
      uid: uuid(),
      name: 'My Collection',
      items: [
        {
          uid: uuid(),
          name: 'Get Countries',
          type: 'http-request',
          request: {
            url: 'https://restcountries.com/v2/alpha/in',
            method: 'GET',
            headers: [],
            params: [],
            body: {
              mode: 'none'
            }
          }
        }
      ]
    };

    const isValid = await collectionSchema.validate(collection);
    expect(isValid).toBeTruthy();
  });

  it('collection schema must validate successfully - simple collection, request with a file key', async () => {
    const collection = {
      version: '1',
      uid: uuid(),
      name: 'My Collection',
      items: [
        {
          uid: uuid(),
          name: 'Get Countries',
          type: 'http-request',
          request: {
            url: 'https://restcountries.com/v2/alpha/in',
            method: 'GET',
            headers: [],
            params: [],
            body: {
              mode: 'none',
            file: []
            },
          }
        }
      ]
    };

    const isValid = await collectionSchema.validate(collection);
    expect(isValid).toBeTruthy();
  });
  it('collection schema must validate successfully - simple collection, folder inside folder', async () => {
    const collection = {
      version: '1',
      uid: uuid(),
      name: 'My Collection',
      items: [
        {
          uid: uuid(),
          name: 'First Level Folder',
          type: 'folder',
          items: [
            {
              uid: uuid(),
              name: 'Second Level Folder',
              type: 'folder'
            }
          ]
        }
      ]
    };

    const isValid = await collectionSchema.validate(collection);
    expect(isValid).toBeTruthy();
  });

  it('collection schema must validate successfully - simple collection, [folder] [request + folder]', async () => {
    const collection = {
      version: '1',
      uid: uuid(),
      name: 'My Collection',
      items: [
        {
          uid: uuid(),
          name: 'First Level Folder',
          type: 'folder',
          items: [
            {
              uid: uuid(),
              name: 'Get Countries',
              type: 'http-request',
              request: {
                url: 'https://restcountries.com/v2/alpha/in',
                method: 'GET',
                headers: [],
                params: [],
                body: {
                  mode: 'none'
                }
              }
            },
            {
              uid: uuid(),
              name: 'Second Level Folder',
              type: 'folder'
            }
          ]
        }
      ]
    };

    const isValid = await collectionSchema.validate(collection);
    expect(isValid).toBeTruthy();
  });
});
