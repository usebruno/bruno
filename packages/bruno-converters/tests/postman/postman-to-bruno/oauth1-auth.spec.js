import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../../src/postman/postman-to-bruno';

describe('OAuth 1.0 Authentication', () => {
  it('should handle OAuth 1.0 auth at request level with all fields', async () => {
    const postmanCollection = {
      info: {
        name: 'OAuth 1.0 Request Auth Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'OAuth 1.0 Request',
          request: {
            method: 'GET',
            url: 'https://api.example.com/test',
            auth: {
              type: 'oauth1',
              oauth1: [
                { key: 'consumerKey', value: 'test-consumer-key' },
                { key: 'consumerSecret', value: 'test-consumer-secret' },
                { key: 'token', value: 'test-access-token' },
                { key: 'tokenSecret', value: 'test-token-secret' },
                { key: 'signatureMethod', value: 'HMAC-SHA256' },
                { key: 'addParamsToHeader', value: 'true' },
                { key: 'requestTokenUrl', value: 'https://api.example.com/oauth/request_token' },
                { key: 'authUrl', value: 'https://api.example.com/oauth/authorize' },
                { key: 'accessTokenUrl', value: 'https://api.example.com/oauth/access_token' },
                { key: 'callback', value: 'http://localhost:8080/callback' },
                { key: 'verifier', value: 'test-verifier' }
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
      oauth1: {
        consumerKey: 'test-consumer-key',
        consumerSecret: 'test-consumer-secret',
        signatureMethod: 'HMAC-SHA256',
        parameterTransmission: 'authorization_header', // addParamsToHeader: true
        requestTokenUrl: 'https://api.example.com/oauth/request_token',
        authorizeUrl: 'https://api.example.com/oauth/authorize',
        accessTokenUrl: 'https://api.example.com/oauth/access_token',
        callbackUrl: 'http://localhost:8080/callback',
        verifier: 'test-verifier',
        accessToken: 'test-access-token',
        accessTokenSecret: 'test-token-secret',
        rsaPrivateKey: '',
        credentialsId: 'credentials'
      },
      digest: null
    });
  });

  it('should handle OAuth 1.0 with query parameter transmission', async () => {
    const postmanCollection = {
      info: {
        name: 'OAuth 1.0 Query Params Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'OAuth 1.0 Query Request',
          request: {
            method: 'GET',
            url: 'https://api.example.com/test',
            auth: {
              type: 'oauth1',
              oauth1: [
                { key: 'consumerKey', value: 'key' },
                { key: 'consumerSecret', value: 'secret' },
                { key: 'addParamsToHeader', value: 'false' } // Should map to query_param
              ]
            }
          }
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.items[0].request.auth.oauth1.parameterTransmission).toBe('query_param');
  });

  it('should handle OAuth 1.0 with RSA signature method', async () => {
    const postmanCollection = {
      info: {
        name: 'OAuth 1.0 RSA Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'OAuth 1.0 RSA Request',
          request: {
            method: 'GET',
            url: 'https://api.example.com/test',
            auth: {
              type: 'oauth1',
              oauth1: [
                { key: 'consumerKey', value: 'rsa-key' },
                { key: 'consumerSecret', value: 'rsa-secret' },
                { key: 'signatureMethod', value: 'RSA-SHA256' },
                { key: 'privateKey', value: '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----' }
              ]
            }
          }
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.items[0].request.auth.oauth1.signatureMethod).toBe('RSA-SHA256');
    expect(result.items[0].request.auth.oauth1.rsaPrivateKey).toBe('-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----');
  });

  it('should default to HMAC-SHA1 when signature method is not specified', async () => {
    const postmanCollection = {
      info: {
        name: 'OAuth 1.0 Default Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'OAuth 1.0 Default Request',
          request: {
            method: 'GET',
            url: 'https://api.example.com/test',
            auth: {
              type: 'oauth1',
              oauth1: [
                { key: 'consumerKey', value: 'key' },
                { key: 'consumerSecret', value: 'secret' }
                // No signatureMethod specified
              ]
            }
          }
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.items[0].request.auth.oauth1.signatureMethod).toBe('HMAC-SHA1');
  });

  it('should handle OAuth 1.0 at folder level', async () => {
    const postmanCollection = {
      info: {
        name: 'OAuth 1.0 Folder Auth Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'OAuth 1.0 Folder',
          auth: {
            type: 'oauth1',
            oauth1: [
              { key: 'consumerKey', value: 'folder-key' },
              { key: 'consumerSecret', value: 'folder-secret' },
              { key: 'token', value: 'folder-token' },
              { key: 'tokenSecret', value: 'folder-token-secret' }
            ]
          },
          item: [
            {
              name: 'Inheriting Request',
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

    expect(result.items[0].root.request.auth.mode).toBe('oauth1');
    expect(result.items[0].root.request.auth.oauth1.consumerKey).toBe('folder-key');
    expect(result.items[0].root.request.auth.oauth1.consumerSecret).toBe('folder-secret');
    expect(result.items[0].root.request.auth.oauth1.accessToken).toBe('folder-token');
    expect(result.items[0].root.request.auth.oauth1.accessTokenSecret).toBe('folder-token-secret');

    // Child request should inherit
    expect(result.items[0].items[0].request.auth.mode).toBe('inherit');
  });

  it('should handle OAuth 1.0 at collection level', async () => {
    const postmanCollection = {
      info: {
        name: 'OAuth 1.0 Collection Auth',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      auth: {
        type: 'oauth1',
        oauth1: [
          { key: 'consumerKey', value: 'collection-key' },
          { key: 'consumerSecret', value: 'collection-secret' }
        ]
      },
      item: [
        {
          name: 'Test Request',
          request: {
            method: 'GET',
            url: 'https://api.example.com/test'
          }
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.root.request.auth.mode).toBe('oauth1');
    expect(result.root.request.auth.oauth1.consumerKey).toBe('collection-key');
    expect(result.root.request.auth.oauth1.consumerSecret).toBe('collection-secret');

    // Request should inherit
    expect(result.items[0].request.auth.mode).toBe('inherit');
  });

  it('should handle all OAuth 1.0 signature methods', async () => {
    const signatureMethods = [
      'HMAC-SHA1',
      'HMAC-SHA256',
      'HMAC-SHA512',
      'RSA-SHA1',
      'RSA-SHA256',
      'RSA-SHA512',
      'PLAINTEXT'
    ];

    for (const method of signatureMethods) {
      const postmanCollection = {
        info: {
          name: `OAuth 1.0 ${method} Collection`,
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Test Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/test',
              auth: {
                type: 'oauth1',
                oauth1: [
                  { key: 'consumerKey', value: 'key' },
                  { key: 'consumerSecret', value: 'secret' },
                  { key: 'signatureMethod', value: method }
                ]
              }
            }
          }
        ]
      };

      const result = await postmanToBruno(postmanCollection);
      expect(result.items[0].request.auth.oauth1.signatureMethod).toBe(method);
    }
  });

  it('should handle minimal OAuth 1.0 configuration', async () => {
    const postmanCollection = {
      info: {
        name: 'Minimal OAuth 1.0 Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Minimal Request',
          request: {
            method: 'GET',
            url: 'https://api.example.com/test',
            auth: {
              type: 'oauth1',
              oauth1: [
                { key: 'consumerKey', value: 'min-key' },
                { key: 'consumerSecret', value: 'min-secret' }
              ]
            }
          }
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.items[0].request.auth.oauth1).toEqual({
      consumerKey: 'min-key',
      consumerSecret: 'min-secret',
      signatureMethod: 'HMAC-SHA1', // Default
      parameterTransmission: 'authorization_header', // Default
      requestTokenUrl: '',
      authorizeUrl: '',
      accessTokenUrl: '',
      callbackUrl: '',
      verifier: '',
      accessToken: '',
      accessTokenSecret: '',
      rsaPrivateKey: '',
      credentialsId: 'credentials'
    });
  });
});
