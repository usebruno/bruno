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

  it('does not set description when input has no description', () => {
    const brunoCollection = {
      uid: 'c2',
      name: 'No Desc',
      version: '1',
      items: [],
      root: {
        request: {
          headers: [
            { uid: 'h2', name: 'Content-Type', value: 'application/json', enabled: true }
          ],
          vars: {
            req: [{ uid: 'v2', name: 'port', value: '3000', enabled: true }],
            res: []
          }
        }
      }
    };

    const openCollection = brunoToOpenCollection(brunoCollection);
    expect(openCollection.request.headers[0]).not.toHaveProperty('description');
    expect(openCollection.request.variables[0]).not.toHaveProperty('description');

    const backToBruno = openCollectionToBruno(openCollection);
    expect(backToBruno.root.request.headers[0]).not.toHaveProperty('description');
    expect(backToBruno.root.request.vars.req[0]).not.toHaveProperty('description');
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

  describe('request params description', () => {
    it('Bruno→OC→Bruno: preserves description, omits when absent or whitespace-only', () => {
      const brunoCollection = {
        uid: 'c-p1',
        name: 'Test',
        version: '1',
        items: [
          {
            uid: 'i-p1',
            type: 'http-request',
            name: 'R',
            request: {
              method: 'GET',
              url: 'https://example.com',
              params: [
                { uid: 'p1', name: 'q', value: 'search', type: 'query', enabled: true, description: 'Search term' },
                { uid: 'p2', name: 'id', value: '42', type: 'path', enabled: true, description: 'Resource ID' },
                { uid: 'p3', name: 'nod', value: 'v', type: 'query', enabled: true },
                { uid: 'p4', name: 'ws', value: 'v', type: 'query', enabled: true, description: '   ' }
              ],
              headers: []
            }
          }
        ],
        root: {}
      };

      const oc = brunoToOpenCollection(brunoCollection);
      const ocParams = oc.items[0].http.params;
      expect(ocParams).toHaveLength(4);
      expect(ocParams[0]).toMatchObject({ name: 'q', description: 'Search term' });
      expect(ocParams[1]).toMatchObject({ name: 'id', description: 'Resource ID' });
      expect(ocParams[2]).not.toHaveProperty('description');
      expect(ocParams[3]).not.toHaveProperty('description');

      const back = openCollectionToBruno(oc);
      const backParams = back.items[0].request.params;
      expect(backParams[0]).toMatchObject({ name: 'q', description: 'Search term' });
      expect(backParams[1]).toMatchObject({ name: 'id', description: 'Resource ID' });
      expect(backParams[2]).not.toHaveProperty('description');
      expect(backParams[3]).not.toHaveProperty('description');
    });

    it('OC→Bruno→OC: preserves description, omits when absent or whitespace-only', () => {
      const openCollection = {
        opencollection: '1.0.0',
        info: { name: 'Test' },
        items: [
          {
            info: { name: 'R', type: 'http' },
            http: {
              method: 'GET',
              url: 'https://example.com',
              params: [
                { name: 'q', value: 'search', type: 'query', description: 'Search term' },
                { name: 'id', value: '42', type: 'path', description: 'Resource ID' },
                { name: 'nod', value: 'v', type: 'query' },
                { name: 'ws', value: 'v', type: 'query', description: '   ' }
              ]
            }
          }
        ]
      };

      const bruno = openCollectionToBruno(openCollection);
      const brunoParams = bruno.items[0].request.params;
      expect(brunoParams[0]).toMatchObject({ name: 'q', description: 'Search term' });
      expect(brunoParams[1]).toMatchObject({ name: 'id', description: 'Resource ID' });
      expect(brunoParams[2]).not.toHaveProperty('description');
      expect(brunoParams[3]).not.toHaveProperty('description');

      const backOC = brunoToOpenCollection(bruno);
      const backParams = backOC.items[0].http.params;
      expect(backParams[0]).toMatchObject({ name: 'q', description: 'Search term' });
      expect(backParams[1]).toMatchObject({ name: 'id', description: 'Resource ID' });
      expect(backParams[2]).not.toHaveProperty('description');
      expect(backParams[3]).not.toHaveProperty('description');
    });
  });

  describe('form-urlencoded body description', () => {
    it('Bruno→OC→Bruno: preserves description, omits when absent or whitespace-only', () => {
      const brunoCollection = {
        uid: 'c-f1',
        name: 'Test',
        version: '1',
        items: [
          {
            uid: 'i-f1',
            type: 'http-request',
            name: 'R',
            request: {
              method: 'POST',
              url: 'https://example.com',
              headers: [],
              body: {
                mode: 'formUrlEncoded',
                formUrlEncoded: [
                  { uid: 'f1', name: 'field', value: 'val', enabled: true, description: 'A form field' },
                  { uid: 'f2', name: 'nod', value: 'v', enabled: true },
                  { uid: 'f3', name: 'ws', value: 'v', enabled: true, description: '   ' }
                ]
              }
            }
          }
        ],
        root: {}
      };

      const oc = brunoToOpenCollection(brunoCollection);
      const ocBody = oc.items[0].http.body;
      expect(ocBody.type).toBe('form-urlencoded');
      expect(ocBody.data).toHaveLength(3);
      expect(ocBody.data[0]).toMatchObject({ name: 'field', description: 'A form field' });
      expect(ocBody.data[1]).not.toHaveProperty('description');
      expect(ocBody.data[2]).not.toHaveProperty('description');

      const back = openCollectionToBruno(oc);
      const backForm = back.items[0].request.body.formUrlEncoded;
      expect(backForm[0]).toMatchObject({ name: 'field', description: 'A form field' });
      expect(backForm[1]).not.toHaveProperty('description');
      expect(backForm[2]).not.toHaveProperty('description');
    });

    it('OC→Bruno→OC: preserves description, omits when absent or whitespace-only', () => {
      const openCollection = {
        opencollection: '1.0.0',
        info: { name: 'Test' },
        items: [
          {
            info: { name: 'R', type: 'http' },
            http: {
              method: 'POST',
              url: 'https://example.com',
              body: {
                type: 'form-urlencoded',
                data: [
                  { name: 'field', value: 'val', description: 'A form field' },
                  { name: 'nod', value: 'v' },
                  { name: 'ws', value: 'v', description: '   ' }
                ]
              }
            }
          }
        ]
      };

      const bruno = openCollectionToBruno(openCollection);
      const brunoForm = bruno.items[0].request.body.formUrlEncoded;
      expect(brunoForm[0]).toMatchObject({ name: 'field', description: 'A form field' });
      expect(brunoForm[1]).not.toHaveProperty('description');
      expect(brunoForm[2]).not.toHaveProperty('description');

      const backOC = brunoToOpenCollection(bruno);
      const backData = backOC.items[0].http.body.data;
      expect(backData[0]).toMatchObject({ name: 'field', description: 'A form field' });
      expect(backData[1]).not.toHaveProperty('description');
      expect(backData[2]).not.toHaveProperty('description');
    });
  });

  describe('multipart-form body description', () => {
    it('Bruno→OC→Bruno: preserves description, omits when absent or whitespace-only', () => {
      const brunoCollection = {
        uid: 'c-m1',
        name: 'Test',
        version: '1',
        items: [
          {
            uid: 'i-m1',
            type: 'http-request',
            name: 'R',
            request: {
              method: 'POST',
              url: 'https://example.com',
              headers: [],
              body: {
                mode: 'multipartForm',
                multipartForm: [
                  { uid: 'm1', name: 'file', value: '', type: 'text', enabled: true, description: 'Upload field' },
                  { uid: 'm2', name: 'nod', value: '', type: 'text', enabled: true },
                  { uid: 'm3', name: 'ws', value: '', type: 'text', enabled: true, description: '   ' }
                ]
              }
            }
          }
        ],
        root: {}
      };

      const oc = brunoToOpenCollection(brunoCollection);
      const ocBody = oc.items[0].http.body;
      expect(ocBody.type).toBe('multipart-form');
      expect(ocBody.data).toHaveLength(3);
      expect(ocBody.data[0]).toMatchObject({ name: 'file', description: 'Upload field' });
      expect(ocBody.data[1]).not.toHaveProperty('description');
      expect(ocBody.data[2]).not.toHaveProperty('description');

      const back = openCollectionToBruno(oc);
      const backMultipart = back.items[0].request.body.multipartForm;
      expect(backMultipart[0]).toMatchObject({ name: 'file', description: 'Upload field' });
      expect(backMultipart[1]).not.toHaveProperty('description');
      expect(backMultipart[2]).not.toHaveProperty('description');
    });

    it('OC→Bruno→OC: preserves description, omits when absent or whitespace-only', () => {
      const openCollection = {
        opencollection: '1.0.0',
        info: { name: 'Test' },
        items: [
          {
            info: { name: 'R', type: 'http' },
            http: {
              method: 'POST',
              url: 'https://example.com',
              body: {
                type: 'multipart-form',
                data: [
                  { name: 'file', type: 'text', value: '', description: 'Upload field' },
                  { name: 'nod', type: 'text', value: '' },
                  { name: 'ws', type: 'text', value: '', description: '   ' }
                ]
              }
            }
          }
        ]
      };

      const bruno = openCollectionToBruno(openCollection);
      const brunoMultipart = bruno.items[0].request.body.multipartForm;
      expect(brunoMultipart[0]).toMatchObject({ name: 'file', description: 'Upload field' });
      expect(brunoMultipart[1]).not.toHaveProperty('description');
      expect(brunoMultipart[2]).not.toHaveProperty('description');

      const backOC = brunoToOpenCollection(bruno);
      const backData = backOC.items[0].http.body.data;
      expect(backData[0]).toMatchObject({ name: 'file', description: 'Upload field' });
      expect(backData[1]).not.toHaveProperty('description');
      expect(backData[2]).not.toHaveProperty('description');
    });
  });
});
