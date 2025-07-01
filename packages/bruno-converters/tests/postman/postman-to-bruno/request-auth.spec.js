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
      mode: 'inherit',
      basic: null,
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null
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
      digest: null
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
      basic: null, bearer: null, awsv4: null, apikey: null, oauth2: null, digest: null
    });
    // Then check request
    expect(result.items[0].items[0].request.auth).toEqual({
      mode: 'inherit',
      basic: null, bearer: null, awsv4: null, apikey: null, oauth2: null, digest: null
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
      digest: null
    });
  });

  it('should handle missing basic auth values in request level', async() => {
    const postmanCollection = {
      info: {
        name: 'Missing Auth Request Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Missing Auth Request',
          request: {
            method: 'GET',
            url: 'https://api.example.com/test',
            auth: {
              type: 'basic'
            }
          }
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.items[0].request.auth).toEqual({
      mode: 'basic',
      basic: {
        username: '',
        password: ''
      },
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null
    });
  });
});
