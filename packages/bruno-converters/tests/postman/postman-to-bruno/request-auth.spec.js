import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../../src/postman/postman-to-bruno';

describe('Request Authentication', () => {
  it('should handle basic auth at request level', async() => {
    const postmanCollection = {
      info: {
        name: 'Request Auth Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Basic Auth Request',
          request: {
            method: 'GET',
            url: 'https://api.example.com/test',
            auth: {
              type: 'basic',
              basic: [
                { key: 'username', value: 'requestuser' },
                { key: 'password', value: 'requestpass' }
              ]
            }
          }
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.items[0].request.auth).toEqual({
      mode: 'basic',
      basic: {
        username: 'requestuser',
        password: 'requestpass'
      },
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null
    });
  });

  it('should inherit folder auth when request has no auth', async() => {
    const postmanCollection = {
      info: {
        name: 'Inherit Request Auth Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Auth Folder',
          auth: {
            type: 'bearer',
            bearer: [{ key: 'token', value: 'foldertoken' }]
          },
          item: [
            {
              name: 'No Auth Request',
              request: {
                method: 'GET',
                url: 'https://api.example.com/test'
              }
            }
          ]
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.items[0].items[0].request.auth).toEqual({
      mode: 'bearer',
      basic: null,
      bearer: {
        token: 'foldertoken'
      },
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null
    });
  });

  it('should override folder auth with request auth', async() => {
    const postmanCollection = {
      info: {
        name: 'Override Request Auth Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Auth Folder',
          auth: {
            type: 'basic',
            basic: [
              { key: 'username', value: 'folderuser' },
              { key: 'password', value: 'folderpass' }
            ]
          },
          item: [
            {
              name: 'Override Auth Request',
              request: {
                method: 'GET',
                url: 'https://api.example.com/test',
                auth: {
                  type: 'bearer',
                  bearer: [{ key: 'token', value: 'requesttoken' }]
                }
              }
            }
          ]
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.items[0].items[0].request.auth).toEqual({
      mode: 'bearer',
      basic: null,
      bearer: {
        token: 'requesttoken'
      },
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null
    });
  });
  
});
