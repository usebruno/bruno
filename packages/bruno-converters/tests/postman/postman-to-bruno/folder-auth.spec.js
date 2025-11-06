import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../../src/postman/postman-to-bruno';

describe('Folder Authentication', () => {
  it('should handle "Inherit Auth" at folder level (auth property absent)', async () => {
    const postmanCollection = {
      info: {
        name: 'Folder Inherit Auth',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Inheriting Folder',
          items: []
        }
      ],
      auth: {
        type: 'basic',
        basic: [
          {
            key: 'password',
            value: 'testpass',
            type: 'string'
          },
          {
            key: 'username',
            value: 'testuser',
            type: 'string'
          }
        ]
      },
      event: [
        {
          listen: 'prerequest',
          script: {
            type: 'text/javascript',
            packages: {},
            exec: ['']
          }
        },
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            packages: {},
            exec: ['']
          }
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.items[0].root.request.auth).toEqual({
      mode: 'inherit',
      basic: null,
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      oauth1: null,
      digest: null
    });
  });

  it('should handle explicit "No Auth" at folder level', async () => {
    const postmanCollection = {
      info: {
        name: 'Folder No Auth',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'No Auth Folder',
          item: [],
          auth: {
            type: 'noauth'
          }
        }
      ],
      auth: {
        type: 'basic',
        basic: [
          {
            key: 'password',
            value: 'testpass',
            type: 'string'
          },
          {
            key: 'username',
            value: 'testuser',
            type: 'string'
          }
        ]
      },
      event: [
        {
          listen: 'prerequest',
          script: {
            type: 'text/javascript',
            packages: {},
            exec: ['']
          }
        },
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            packages: {},
            exec: ['']
          }
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.items[0].root.request.auth).toEqual({
      mode: 'none',
      basic: null,
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      oauth1: null,
      digest: null
    });
  });

  it('should handle basic auth at folder level', async () => {
    const postmanCollection = {
      info: {
        name: 'Folder level basic auth',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'folder',
          item: [],
          auth: {
            type: 'basic',
            basic: [
              {
                key: 'password',
                value: 'testpass',
                type: 'string'
              },
              {
                key: 'username',
                value: 'testuser',
                type: 'string'
              }
            ]
          },
          event: [
            {
              listen: 'prerequest',
              script: {
                type: 'text/javascript',
                packages: {},
                exec: ['']
              }
            },
            {
              listen: 'test',
              script: {
                type: 'text/javascript',
                packages: {},
                exec: ['']
              }
            }
          ]
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.items[0].root.request.auth).toEqual({
      mode: 'basic',
      basic: {
        username: 'testuser',
        password: 'testpass'
      },
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      oauth1: null,
      digest: null
    });
  });

  it('should handle bearer token auth at folder level', async () => {
    const postmanCollection = {
      info: {
        name: 'Folder level bearer token',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'folder',
          item: [],
          auth: {
            type: 'bearer',
            bearer: [
              {
                key: 'token',
                value: 'token',
                type: 'string'
              }
            ]
          },
          event: [
            {
              listen: 'prerequest',
              script: {
                type: 'text/javascript',
                packages: {},
                exec: ['']
              }
            },
            {
              listen: 'test',
              script: {
                type: 'text/javascript',
                packages: {},
                exec: ['']
              }
            }
          ]
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.items[0].root.request.auth).toEqual({
      mode: 'bearer',
      basic: null,
      bearer: { token: 'token' },
      awsv4: null,
      apikey: null,
      oauth2: null,
      oauth1: null,
      digest: null
    });
  });

  it('should handle API key auth at folder level', async () => {
    const postmanCollection = {
      info: {
        name: 'Folder level API key',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'folder',
          item: [],
          auth: {
            type: 'apikey',
            apikey: [
              {
                key: 'value',
                value: 'apikey',
                type: 'string'
              },
              {
                key: 'key',
                value: 'apikey',
                type: 'string'
              }
            ]
          },
          event: [
            {
              listen: 'prerequest',
              script: {
                type: 'text/javascript',
                packages: {},
                exec: ['']
              }
            },
            {
              listen: 'test',
              script: {
                type: 'text/javascript',
                packages: {},
                exec: ['']
              }
            }
          ]
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.items[0].root.request.auth).toEqual({
      mode: 'apikey',
      basic: null,
      bearer: null,
      awsv4: null,
      apikey: { key: 'apikey', value: 'apikey', placement: 'header' },
      oauth2: null,
      oauth1: null,
      digest: null
    });
  });

  it('should handle digest auth at folder level', async () => {
    const postmanCollection = {
      info: {
        name: 'Folder level digest auth',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'folder',
          item: [],
          auth: {
            type: 'digest',
            digest: [
              {
                key: 'password',
                value: 'digest pass',
                type: 'string'
              },
              {
                key: 'username',
                value: 'digest user',
                type: 'string'
              },
              {
                key: 'algorithm',
                value: 'MD5',
                type: 'string'
              }
            ]
          },
          event: [
            {
              listen: 'prerequest',
              script: {
                type: 'text/javascript',
                packages: {},
                exec: ['']
              }
            },
            {
              listen: 'test',
              script: {
                type: 'text/javascript',
                packages: {},
                exec: ['']
              }
            }
          ]
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.items[0].root.request.auth).toEqual({
      mode: 'digest',
      basic: null,
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      oauth1: null,
      digest: { username: 'digest user', password: 'digest pass' }
    });
  });

  it('should handle missing auth values in folder level auth', async () => {
    const postmanCollection = {
      info: {
        name: 'Folder with missing auth values',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'folder',
          item: [],
          auth: {
            type: 'basic'
            // Missing basic values
          },
          event: [
            {
              listen: 'prerequest',
              script: {
                type: 'text/javascript',
                packages: {},
                exec: ['']
              }
            },
            {
              listen: 'test',
              script: {
                type: 'text/javascript',
                packages: {},
                exec: ['']
              }
            }
          ]
        }
      ]
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.items[0].root.request.auth).toEqual({
      mode: 'basic',
      basic: {
        username: '',
        password: ''
      },
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      oauth1: null,
      digest: null
    });
  });
});
