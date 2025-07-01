import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../../src/postman/postman-to-bruno';

describe('Collection Authentication', () => {
  it('should handle no auth at collection level (when auth property is absent)', async () => {
    const postmanCollection = {
      info: {
        name: 'Collection level no auth',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [],
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
    // console.log('result', JSON.stringify(result, null, 2));

    expect(result.root.request.auth).toEqual({
      mode: 'none',
      basic: null,
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null
    });
  });

  it('should handle basic auth at collection level', async () => {
    const postmanCollection = {
      info: {
        name: 'Collection level basic auth',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
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
    };

    const result = await postmanToBruno(postmanCollection);
    // console.log('result', JSON.stringify(result, null, 2));

    expect(result.root.request.auth).toEqual({
      mode: 'basic',
      basic: {
        username: 'testuser',
        password: 'testpass'
      },
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null
    });
  });

  it('should handle bearer token auth at collection level', async () => {
    const postmanCollection = {
      info: {
        name: 'Collection level bearer token',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
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
    };

    const result = await postmanToBruno(postmanCollection);
    // console.log('result', JSON.stringify(result, null, 2));

    expect(result.root.request.auth).toEqual({
      mode: 'bearer',
      basic: null,
      bearer: {
        token: 'token'
      },
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null
    });
  });

  it('should handle API key auth at collection level', async () => {
    const postmanCollection = {
      info: {
        name: 'Collection level api key',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
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
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.root.request.auth).toEqual({
      mode: 'apikey',
      basic: null,
      bearer: null,
      awsv4: null,
      apikey: {
        key: 'apikey',
        value: 'apikey',
        placement: 'header'
      },
      oauth2: null,
      digest: null
    });
  });

  it('should handle digest auth at collection level', async () => {
    const postmanCollection = {
      info: {
        name: 'Collection level digest auth',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [],
      auth: {
        type: 'digest',
        digest: [
          {
            key: 'password',
            value: 'digest auth',
            type: 'string'
          },
          {
            key: 'username',
            value: 'digest auth',
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
    };

    const result = await postmanToBruno(postmanCollection);

    expect(result.root.request.auth).toEqual({
      mode: 'digest',
      basic: null,
      bearer: null,
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: {
        username: 'digest auth',
        password: 'digest auth'
      }
    });
  });

  it('should handle missing auth values when auth.type exists', async() => {
    const postmanCollection = {
      info: {
        name: 'Collection with missing auth values',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [],
      auth: {
        type: 'basic'
        // Missing basic auth values
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

    expect(result.root.request.auth).toEqual({
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

  it('should handle missing auth values for different auth types', async() => {
    const postmanCollection = {
      info: {
        name: 'Collection with missing auth values for different types',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [],
      auth: {
        type: 'bearer'
        // Missing bearer token
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

    expect(result.root.request.auth).toEqual({
      mode: 'bearer',
      basic: null,
      bearer: {
        token: ''
      },
      awsv4: null,
      apikey: null,
      oauth2: null,
      digest: null
    });
  });
});
