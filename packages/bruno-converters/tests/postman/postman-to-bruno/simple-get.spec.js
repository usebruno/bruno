import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../../src/postman/postman-to-bruno';

describe('Simple GET Request', () => {
  it('should convert a basic GET request', () => {
    const postmanCollection = {
      info: {
        name: 'Simple GET',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'simple get',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: 'https://usebruno.com',
              protocol: 'https',
              host: ['usebruno', 'com']
            }
          },
          response: []
        }
      ]
    };

    const result = postmanToBruno(postmanCollection);

    expect(result.items[0]).toEqual({
      uid: 'mockeduuidvalue123456',
      name: 'simple get',
      type: 'http-request',
      request: {
        url: 'https://usebruno.com',
        method: 'GET',
        auth: {
          mode: 'none',
          basic: null,
          bearer: null,
          awsv4: null,
          apikey: null,
          oauth2: null,
          digest: null
        },
        headers: [],
        params: [],
        body: {
          mode: 'none',
          json: null,
          text: null,
          xml: null,
          formUrlEncoded: [],
          multipartForm: []
        },
        docs: ''
      },
      seq: 1
    });
  });
});
