import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../../src/postman/postman-to-bruno';

describe('Request Authentication', () => {
  it('should handle basic auth at request level', async () => {
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
      oauth1: null,
      digest: null
    });
  });

  it('should inherit folder auth when request has no auth', async () => {
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
              name: 'Inherit Auth Request',
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
      mode: 'inherit',
      basic: null,
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null,
      oauth1: null
    });
  });

  it('should handle "Inherit Auth" for request (auth property absent, inherits from folder)', async () => {
    const postmanCollection = {
      info: {
        name: 'Request Inherit Auth from Folder',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Auth Folder',
          auth: { // Folder has auth
            type: 'bearer',
            bearer: [{ key: 'token', value: 'foldertoken' }]
          },
          item: [
            {
              name: 'Inheriting Request',
              request: {
                method: 'GET',
                url: 'https://api.example.com/test'
                // auth property is ABSENT for this request, meaning "Inherit auth from parent"
              }
            }
          ]
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.items[0].items[0].request.auth).toEqual({
      mode: 'inherit',
      basic: null,
      bearer: null, // It should NOT have the folder's token directly here after import
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null,
      oauth1: null
    });
  });

  it('should handle "Inherit Auth" for request (auth property absent, inherits from collection if folder also inherits)', async () => {
    const postmanCollection = {
      info: {
        name: 'Request Inherit Auth from Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      auth: { // Collection has auth
        type: 'basic',
        basic: [

          { key: 'username', value: 'requestuser' },
          { key: 'password', value: 'requestpass' }
        ]
      },
      item: [
        {
          name: 'Inheriting Folder',
          // auth property is ABSENT for this folder
          item: [
            {
              name: 'Inheriting Request',
              request: {
                method: 'GET',
                url: 'https://api.example.com/test'
                // auth property is ABSENT for this request
              }
            }
          ]
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    // Check folder first
    expect(result.items[0].root.request.auth).toEqual({
      mode: 'inherit',
      basic: null, bearer: null, awsv4: null, apikey: null, oauth2: null, digest: null, oauth1: null
    });
    // Then check request
    expect(result.items[0].items[0].request.auth).toEqual({
      mode: 'inherit',
      basic: null, bearer: null, awsv4: null, apikey: null, oauth2: null, digest: null, oauth1: null
    });
  });

  it('should handle explicit "No Auth" at request level', async () => {
    const postmanCollection = {
      info: {
        name: 'Request No Auth',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Auth Folder', // Parent folder might have auth
          auth: {
            type: 'bearer',
            bearer: [{ key: 'token', value: 'foldertoken' }]
          },
          item: [
            {
              name: 'Explicit No Auth Request',
              request: {
                method: 'GET',
                url: 'https://api.example.com/test',
                auth: { // Request explicitly set to "No Auth"
                  type: 'noauth'
                }
              }
            }
          ]
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.items[0].items[0].request.auth).toEqual({
      mode: 'none', // <<<< KEY CHECK
      basic: null,
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null,
      oauth1: null
    });
  });

  it('should handle "Inherit Auth" for a request nested under multiple inheriting folders', async () => {
    const postmanCollection = {
      info: {
        name: 'Multi-Level Inherit Auth',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      auth: { // Collection level auth
        type: 'basic',
        basic: [
          { key: 'username', value: 'collectionUser' },
          { key: 'password', value: 'collectionPass' }
        ]
      },
      item: [
        {
          name: 'Folder Level 1 (Inherit)',
          // auth property is ABSENT for this folder, meaning "Inherit"
          item: [
            {
              name: 'Folder Level 2 (Inherit)',
              // auth property is ABSENT for this folder, meaning "Inherit"
              item: [
                {
                  name: 'Deeply Nested Request (Inherit)',
                  request: {
                    method: 'GET',
                    url: 'https://api.example.com/deep'
                    // auth property is ABSENT for this request, meaning "Inherit"
                  }
                }
              ]
            }
          ]
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    // Check Folder Level 1
    expect(result.items[0].root.request.auth).toEqual({
      mode: 'inherit',
      basic: null, bearer: null, awsv4: null, apikey: null, oauth2: null, digest: null, oauth1: null
    });

    // Check Folder Level 2
    expect(result.items[0].items[0].root.request.auth).toEqual({
      mode: 'inherit',
      basic: null, bearer: null, awsv4: null, apikey: null, oauth2: null, digest: null, oauth1: null
    });

    // Check the Request
    expect(result.items[0].items[0].items[0].request.auth).toEqual({
      mode: 'inherit',
      basic: null, bearer: null, awsv4: null, apikey: null, oauth2: null, digest: null, oauth1: null
    });
  });

  it('should handle "Inherit Auth" where an intermediate folder has explicit auth', async () => {
    const postmanCollection = {
      info: {
        name: 'Multi-Level Inherit with Override',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      auth: { // Collection level auth
        type: 'basic',
        basic: [
          { key: 'username', value: 'collectionUser' },
          { key: 'password', value: 'collectionPass' }
        ]
      },
      item: [
        {
          name: 'Folder Level 1 (Explicit Bearer)',
          auth: { // This folder has its own auth
            type: 'bearer',
            bearer: [{ key: 'token', value: 'folder1Token' }]
          },
          item: [
            {
              name: 'Folder Level 2 (Inherit from Folder 1)',
              // auth property is ABSENT for this folder, meaning "Inherit"
              item: [
                {
                  name: 'Deeply Nested Request (Inherit from Folder 1 via Folder 2)',
                  request: {
                    method: 'GET',
                    url: 'https://api.example.com/deep_override'
                    // auth property is ABSENT for this request, meaning "Inherit"
                  }
                }
              ]
            }
          ]
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    // Check Folder Level 1
    expect(result.items[0].root.request.auth).toEqual({
      mode: 'bearer',
      basic: null,
      bearer: { token: 'folder1Token' }, // Explicitly set
      awsv4: null, apikey: null, oauth2: null, digest: null, oauth1: null
    });

    // Check Folder Level 2
    expect(result.items[0].items[0].root.request.auth).toEqual({
      mode: 'inherit', // Inherits from Folder 1
      basic: null, bearer: null, awsv4: null, apikey: null, oauth2: null, digest: null, oauth1: null
    });

    // Check the Request
    expect(result.items[0].items[0].items[0].request.auth).toEqual({
      mode: 'inherit', // Inherits from Folder 1
      basic: null, bearer: null, awsv4: null, apikey: null, oauth2: null, digest: null, oauth1: null
    });
  });

  it('should handle oauth1 auth with HMAC-SHA1 and placement query (addParamsToHeader false)', async () => {
    const postmanCollection = {
      info: {
        name: 'OAuth1 HMAC Query Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'OAuth1 HMAC Query Request',
          request: {
            method: 'GET',
            url: 'http://www.example.com',
            auth: {
              type: 'oauth1',
              oauth1: [
                { key: 'consumerKey', value: 'consumer_key', type: 'string' },
                { key: 'consumerSecret', value: 'consumer_secret', type: 'string' },
                { key: 'token', value: 'access_token', type: 'string' },
                { key: 'tokenSecret', value: 'token_secret', type: 'string' },
                { key: 'signatureMethod', value: 'HMAC-SHA1', type: 'string' },
                { key: 'version', value: '1.0', type: 'string' },
                { key: 'addParamsToHeader', value: false, type: 'boolean' },
                { key: 'includeBodyHash', value: true, type: 'boolean' },
                { key: 'callback', value: 'https://www.example.com', type: 'string' },
                { key: 'verifier', value: 'verifier', type: 'string' }
              ]
            }
          }
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.items[0].request.auth).toEqual({
      mode: 'oauth1',
      basic: null,
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null,
      oauth1: {
        consumerKey: 'consumer_key',
        consumerSecret: 'consumer_secret',
        accessToken: 'access_token',
        accessTokenSecret: 'token_secret',
        callbackUrl: 'https://www.example.com',
        verifier: 'verifier',
        signatureEncoding: 'HMAC-SHA1',
        privateKey: null,
        privateKeyType: 'text',
        timestamp: null,
        nonce: null,
        version: '1.0',
        realm: null,
        placement: 'query',
        includeBodyHash: true
      }
    });
  });

  it('should handle oauth1 auth with HMAC-SHA1 and placement header (addParamsToHeader true)', async () => {
    const postmanCollection = {
      info: {
        name: 'OAuth1 HMAC Header Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'OAuth1 HMAC Header Request',
          request: {
            method: 'GET',
            url: 'http://www.example.com',
            auth: {
              type: 'oauth1',
              oauth1: [
                { key: 'consumerKey', value: 'consumer_key', type: 'string' },
                { key: 'consumerSecret', value: 'consumer_secret', type: 'string' },
                { key: 'token', value: 'access_token', type: 'string' },
                { key: 'tokenSecret', value: 'token_secret', type: 'string' },
                { key: 'signatureMethod', value: 'HMAC-SHA1', type: 'string' },
                { key: 'version', value: '1.0', type: 'string' },
                { key: 'addParamsToHeader', value: true, type: 'boolean' },
                { key: 'includeBodyHash', value: true, type: 'boolean' },
                { key: 'callback', value: 'https://www.example.com', type: 'string' },
                { key: 'verifier', value: 'verifier', type: 'string' }
              ]
            }
          }
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.items[0].request.auth.mode).toBe('oauth1');
    expect(result.items[0].request.auth.oauth1.placement).toBe('header');
    expect(result.items[0].request.auth.oauth1.consumerKey).toBe('consumer_key');
    expect(result.items[0].request.auth.oauth1.accessToken).toBe('access_token');
    expect(result.items[0].request.auth.oauth1.accessTokenSecret).toBe('token_secret');
  });

  it('should handle oauth1 auth with RSA-SHA1 and private key', async () => {
    const privateKey = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----';
    const postmanCollection = {
      info: {
        name: 'OAuth1 RSA Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'OAuth1 RSA Request',
          request: {
            method: 'GET',
            url: 'http://www.example.com',
            auth: {
              type: 'oauth1',
              oauth1: [
                { key: 'consumerKey', value: 'consumer_key', type: 'string' },
                { key: 'consumerSecret', value: 'consumer_secret', type: 'string' },
                { key: 'token', value: 'access_token', type: 'string' },
                { key: 'tokenSecret', value: 'token_secret', type: 'string' },
                { key: 'signatureMethod', value: 'RSA-SHA1', type: 'string' },
                { key: 'privateKey', value: privateKey, type: 'string' },
                { key: 'version', value: '1.0', type: 'string' },
                { key: 'addParamsToHeader', value: true, type: 'boolean' },
                { key: 'includeBodyHash', value: true, type: 'boolean' },
                { key: 'callback', value: 'https://www.example.com', type: 'string' },
                { key: 'verifier', value: 'verifier', type: 'string' }
              ]
            }
          }
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.items[0].request.auth.mode).toBe('oauth1');
    expect(result.items[0].request.auth.oauth1.signatureEncoding).toBe('RSA-SHA1');
    expect(result.items[0].request.auth.oauth1.privateKey).toBe(privateKey);
    expect(result.items[0].request.auth.oauth1.privateKeyType).toBe('text');
    expect(result.items[0].request.auth.oauth1.placement).toBe('header');
  });

  it('should handle oauth1 auth at collection level', async () => {
    const postmanCollection = {
      info: {
        name: 'OAuth1 Collection Level',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      auth: {
        type: 'oauth1',
        oauth1: [
          { key: 'consumerKey', value: 'col_consumer_key', type: 'string' },
          { key: 'consumerSecret', value: 'col_consumer_secret', type: 'string' },
          { key: 'token', value: 'col_access_token', type: 'string' },
          { key: 'tokenSecret', value: 'col_token_secret', type: 'string' },
          { key: 'signatureMethod', value: 'HMAC-SHA1', type: 'string' },
          { key: 'addParamsToHeader', value: true, type: 'boolean' }
        ]
      },
      item: [
        {
          name: 'Inheriting Request',
          request: {
            method: 'GET',
            url: 'http://www.example.com'
          }
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    // Collection root should have oauth1
    expect(result.root.request.auth.mode).toBe('oauth1');
    expect(result.root.request.auth.oauth1.consumerKey).toBe('col_consumer_key');
    expect(result.root.request.auth.oauth1.accessToken).toBe('col_access_token');
    expect(result.root.request.auth.oauth1.placement).toBe('header');

    // Request should inherit
    expect(result.items[0].request.auth.mode).toBe('inherit');
    expect(result.items[0].request.auth.oauth1).toBe(null);
  });

  it('should handle "Inherit Auth" where an intermediate folder has explicit "No Auth"', async () => {
    const postmanCollection = {
      info: {
        name: 'Multi-Level Inherit with No Auth Stop',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      auth: { // Collection level auth
        type: 'basic',
        basic: [
          { key: 'username', value: 'collectionUser' },
          { key: 'password', value: 'collectionPass' }
        ]
      },
      item: [
        {
          name: 'Folder Level 1 (Explicit No Auth)',
          auth: { // This folder is explicitly "No Auth"
            type: 'noauth'
          },
          item: [
            {
              name: 'Folder Level 2 (Inherit from Folder 1 - so No Auth)',
              // auth property is ABSENT for this folder, meaning "Inherit"
              item: [
                {
                  name: 'Deeply Nested Request (Inherit from Folder 1 via Folder 2 - so No Auth)',
                  request: {
                    method: 'GET',
                    url: 'https://api.example.com/deep_no_auth_stop'
                    // auth property is ABSENT for this request, meaning "Inherit"
                  }
                }
              ]
            }
          ]
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    // Check Folder Level 1
    expect(result.items[0].root.request.auth).toEqual({
      mode: 'none', // Explicitly "No Auth"
      basic: null, bearer: null, awsv4: null, apikey: null, oauth2: null, digest: null, oauth1: null
    });

    // Check Folder Level 2
    expect(result.items[0].items[0].root.request.auth).toEqual({
      mode: 'inherit', // Inherits from Folder 1
      basic: null, bearer: null, awsv4: null, apikey: null, oauth2: null, digest: null, oauth1: null
    });

    // Check the Request
    expect(result.items[0].items[0].items[0].request.auth).toEqual({
      mode: 'inherit', // Inherits from Folder 1
      basic: null, bearer: null, awsv4: null, apikey: null, oauth2: null, digest: null, oauth1: null
    });
  });
});
