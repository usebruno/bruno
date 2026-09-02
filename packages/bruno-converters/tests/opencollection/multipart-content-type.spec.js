import { describe, it, expect } from '@jest/globals';
import { brunoToOpenCollection, openCollectionToBruno } from '../../dist/esm/index.js';

describe('multipart-form contentType', () => {
  it('Bruno→OC→Bruno: preserves contentType, omits when empty', () => {
    const brunoCollection = {
      uid: 'c-ct1',
      name: 'Test',
      version: '1',
      items: [
        {
          uid: 'i-ct1',
          type: 'http-request',
          name: 'R',
          request: {
            method: 'POST',
            url: 'https://example.com',
            headers: [],
            body: {
              mode: 'multipartForm',
              multipartForm: [
                { uid: 'm1', name: 'metadata', value: '{"tag":"v1"}', type: 'text', enabled: true, contentType: 'application/json' },
                { uid: 'm2', name: 'plain', value: 'hello', type: 'text', enabled: true, contentType: '' },
                { uid: 'm3', name: 'avatar', value: ['/tmp/me.png'], type: 'file', enabled: false, contentType: 'image/png' }
              ]
            }
          }
        }
      ],
      root: {}
    };

    const oc = brunoToOpenCollection(brunoCollection);
    const data = oc.items[0].http.body.data;
    expect(data[0]).toMatchObject({ name: 'metadata', contentType: 'application/json' });
    expect(data[1]).not.toHaveProperty('contentType');
    expect(data[2]).toMatchObject({ name: 'avatar', contentType: 'image/png', disabled: true });

    const back = openCollectionToBruno(oc);
    const mp = back.items[0].request.body.multipartForm;
    expect(mp[0].contentType).toBe('application/json');
    expect(mp[1].contentType).toBeNull();
    expect(mp[2].contentType).toBe('image/png');
    expect(mp[2].value).toEqual(['/tmp/me.png']);
  });

  it('OC→Bruno: reads contentType from yaml, null when absent', () => {
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
                { name: 'metadata', type: 'text', value: '{}', contentType: 'application/json' },
                { name: 'plain', type: 'text', value: 'x' }
              ]
            }
          }
        }
      ]
    };

    const bruno = openCollectionToBruno(openCollection);
    const mp = bruno.items[0].request.body.multipartForm;
    expect(mp[0].contentType).toBe('application/json');
    expect(mp[1].contentType).toBeNull();
  });
});
