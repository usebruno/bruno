import { describe, it, expect } from '@jest/globals';
import { brunoToOpenCollection, openCollectionToBruno } from '../../dist/esm/index.js';

describe('opencollection description round-trip', () => {
  it('preserves description on headers and vars when converting Bruno -> OpenCollection -> Bruno', () => {
    const brunoCollection = {
      uid: 'c1',
      name: 'Test',
      version: '1',
      items: [],
      root: {
        request: {
          headers: [
            { uid: 'h1', name: 'X-API-Key', value: 'secret', enabled: true, description: 'API key for auth' }
          ],
          vars: {
            req: [
              { uid: 'v1', name: 'baseUrl', value: 'https://api.example.com', enabled: true, description: 'Base API URL' }
            ],
            res: []
          }
        }
      }
    };

    const openCollection = brunoToOpenCollection(brunoCollection);

    expect(openCollection.request).toBeDefined();
    expect(openCollection.request.headers).toHaveLength(1);
    expect(openCollection.request.headers[0]).toMatchObject({
      name: 'X-API-Key',
      value: 'secret',
      description: 'API key for auth'
    });
    expect(openCollection.request.variables).toHaveLength(1);
    expect(openCollection.request.variables[0]).toMatchObject({
      name: 'baseUrl',
      value: 'https://api.example.com',
      description: 'Base API URL'
    });

    const backToBruno = openCollectionToBruno(openCollection);

    expect(backToBruno.root.request.headers).toHaveLength(1);
    expect(backToBruno.root.request.headers[0].description).toBe('API key for auth');
    expect(backToBruno.root.request.vars.req).toHaveLength(1);
    expect(backToBruno.root.request.vars.req[0].description).toBe('Base API URL');
  });

  it('preserves description when converting OpenCollection -> Bruno -> OpenCollection', () => {
    const openCollection = {
      opencollection: '1.0.0',
      info: { name: 'OC Test' },
      request: {
        headers: [
          { name: 'Authorization', value: 'Bearer x', description: 'Auth header' }
        ],
        variables: [

          { name: 'token', value: 'abc', description: 'Request token' }
        ]
      }
    };

    const brunoCollection = openCollectionToBruno(openCollection);

    expect(brunoCollection.root.request.headers).toHaveLength(1);
    expect(brunoCollection.root.request.headers[0].description).toBe('Auth header');
    expect(brunoCollection.root.request.vars.req).toHaveLength(1);
    expect(brunoCollection.root.request.vars.req[0].description).toBe('Request token');

    const backToOC = brunoToOpenCollection(brunoCollection);

    expect(backToOC.request.headers[0].description).toBe('Auth header');
    expect(backToOC.request.variables[0].description).toBe('Request token');
  });
});
