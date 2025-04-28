import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../../src/postman/postman-to-bruno';

describe('Complete Postman to Bruno Conversion', () => {
  it('should handle a complete Postman collection with all features', () => {
    const postmanCollection = {
      info: {
        name: 'Complete Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Folder',
          item: [
            {
              name: 'Request',
              event: [
                {
                  listen: 'prerequest',
                  script: {
                    exec: ['console.log("request level pre-request script");'],
                    type: 'text/javascript',
                    packages: {}
                  }
                },
                {
                  listen: 'test',
                  script: {
                    exec: ['console.log("request level post-request script")'],
                    type: 'text/javascript',
                    packages: {}
                  }
                }
              ],
              protocolProfileBehavior: {
                disableBodyPruning: true
              },
              request: {
                auth: {
                  type: 'digest',
                  digest: [
                    {
                      key: 'password',
                      value: 'testpass',
                      type: 'string'
                    },
                    {
                      key: 'username',
                      value: 'testuser',
                      type: 'string'
                    },
                    {
                      key: 'qop',
                      value: 'auth',
                      type: 'string'
                    },
                    {
                      key: 'algorithm',
                      value: 'MD5',
                      type: 'string'
                    }
                  ]
                },
                method: 'GET',
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json',
                    type: 'text'
                  }
                ],
                body: {
                  mode: 'raw',
                  raw: '{\n    "alphabets": "abcdefghijklmnopqrstuvwxyz"\n}',
                  options: {
                    raw: {
                      language: 'json'
                    }
                  }
                },
                url: {
                  raw: 'https://usebruno.com?request_qp_1=1&request_qp_2=2&request_qp_3=3',
                  protocol: 'https',
                  host: ['usebruno', 'com'],
                  query: [
                    {
                      key: 'request_qp_1',
                      value: '1'
                    },
                    {
                      key: 'request_qp_2',
                      value: '2'
                    },
                    {
                      key: 'request_qp_3',
                      value: '3'
                    }
                  ]
                }
              },
              response: []
            }
          ],
          auth: {
            type: 'bearer',
            bearer: [
              {
                key: 'token',
                value: 'bearer-token-123',
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
                exec: ['console.log("folder level pre-request script");']
              }
            },
            {
              listen: 'test',
              script: {
                type: 'text/javascript',
                packages: {},
                exec: ['console.log("folder level post-response script");']
              }
            }
          ]
        },
        {
          name: 'Request',
          event: [
            {
              listen: 'prerequest',
              script: {
                exec: ['console.log("request level pre-request script");'],
                type: 'text/javascript',
                packages: {}
              }
            },
            {
              listen: 'test',
              script: {
                exec: ['console.log("request level post-request script")'],
                type: 'text/javascript',
                packages: {}
              }
            }
          ],
          protocolProfileBehavior: {
            disableBodyPruning: true
          },
          request: {
            auth: {
              type: 'digest',
              digest: [
                {
                  key: 'password',
                  value: 'testpass',
                  type: 'string'
                },
                {
                  key: 'username',
                  value: 'testuser',
                  type: 'string'
                },
                {
                  key: 'qop',
                  value: 'auth',
                  type: 'string'
                },
                {
                  key: 'algorithm',
                  value: 'MD5',
                  type: 'string'
                }
              ]
            },
            method: 'GET',
            header: [
              {
                key: 'Content-Type',
                value: 'application/json',
                type: 'text'
              }
            ],
            body: {
              mode: 'raw',
              raw: '{\n    "alphabets": "abcdefghijklmnopqrstuvwxyz"\n}',
              options: {
                raw: {
                  language: 'json'
                }
              }
            },
            url: {
              raw: 'https://usebruno.com?request_qp_1=1&request_qp_2=2&request_qp_3=3',
              protocol: 'https',
              host: ['usebruno', 'com'],
              query: [
                {
                  key: 'request_qp_1',
                  value: '1'
                },
                {
                  key: 'request_qp_2',
                  value: '2'
                },
                {
                  key: 'request_qp_3',
                  value: '3'
                }
              ]
            }
          },
          response: []
        }
      ],
      auth: {
        type: 'basic',
        basic: [
          {
            key: 'password',
            value: 'collectionpass',
            type: 'string'
          },
          {
            key: 'username',
            value: 'collectionuser',
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
            exec: ['console.log("collection level pre-request script");']
          }
        },
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            packages: {},
            exec: ['console.log("collection level post-response script");']
          }
        }
      ],
      variable: [
        {
          key: 'collection_var_1',
          value: '1',
          type: 'string'
        },
        {
          key: 'collection_var_2',
          value: '2',
          type: 'string'
        },
        {
          key: 'collection_var_3',
          value: '3',
          type: 'string'
        }
      ]
    };

    const result = postmanToBruno(postmanCollection);

    // Verify collection-level properties
    expect(result.name).toBe('Complete Collection');
    expect(result.uid).toBe('mockeduuidvalue123456');
    expect(result.version).toBe('1');

    // Verify collection root
    expect(result.root).toEqual({
      docs: '',
      meta: { name: 'Complete Collection' },
      request: {
        auth: {
          mode: 'basic',
          basic: { username: 'collectionuser', password: 'collectionpass' },
          bearer: null,
          awsv4: null,
          apikey: null,
          oauth2: null,
          digest: null
        },
        headers: [],
        script: { req: 'console.log("collection level pre-request script");' },
        tests: 'console.log("collection level post-response script");',
        vars: {
          req: [
            {
              uid: 'mockeduuidvalue123456',
              name: 'collection_var_1',
              value: '1',
              enabled: true
            },
            {
              uid: 'mockeduuidvalue123456',
              name: 'collection_var_2',
              value: '2',
              enabled: true
            },
            {
              uid: 'mockeduuidvalue123456',
              name: 'collection_var_3',
              value: '3',
              enabled: true
            }
          ]
        }
      }
    });

    // Verify folder
    const folder = result.items[0];
    expect(folder.name).toBe('Folder');
    expect(folder.type).toBe('folder');
    expect(folder.root).toEqual({
      docs: '',
      meta: { name: 'Folder' },
      request: {
        auth: {
          mode: 'bearer',
          basic: null,
          bearer: { token: 'bearer-token-123' },
          awsv4: null,
          apikey: null,
          oauth2: null,
          digest: null
        },
        headers: [],
        script: { req: 'console.log("folder level pre-request script");' },
        tests: 'console.log("folder level post-response script");',
        vars: {}
      }
    });

    // Verify request in folder
    const request = folder.items[0];
    expect(request.name).toBe('Request');
    expect(request.type).toBe('http-request');
    expect(request.request).toEqual({
      url: 'https://usebruno.com?request_qp_1=1&request_qp_2=2&request_qp_3=3',
      method: 'GET',
      auth: {
        mode: 'digest',
        basic: null,
        bearer: null,
        awsv4: null,
        apikey: null,
        oauth2: null,
        digest: { username: 'testuser', password: 'testpass' }
      },
      headers: [
        {
          uid: 'mockeduuidvalue123456',
          name: 'Content-Type',
          value: 'application/json',
          description: undefined,
          enabled: true
        }
      ],
      params: [
        {
          uid: 'mockeduuidvalue123456',
          name: 'request_qp_1',
          value: '1',
          description: undefined,
          type: 'query',
          enabled: true
        },
        {
          uid: 'mockeduuidvalue123456',
          name: 'request_qp_2',
          value: '2',
          description: undefined,
          type: 'query',
          enabled: true
        },
        {
          uid: 'mockeduuidvalue123456',
          name: 'request_qp_3',
          value: '3',
          description: undefined,
          type: 'query',
          enabled: true
        }
      ],
      body: {
        mode: 'json',
        json: '{\n    "alphabets": "abcdefghijklmnopqrstuvwxyz"\n}',
        text: null,
        xml: null,
        formUrlEncoded: [],
        multipartForm: []
      },
      docs: '',
      script: { req: 'console.log("request level pre-request script");' },
      tests: 'console.log("request level post-request script")'
    });
    expect(request.seq).toBe(1);

    // Verify root request
    const rootRequest = result.items[1];
    expect(rootRequest.name).toBe('Request');
    expect(rootRequest.type).toBe('http-request');
    expect(rootRequest.request).toEqual({
      url: 'https://usebruno.com?request_qp_1=1&request_qp_2=2&request_qp_3=3',
      method: 'GET',
      auth: {
        mode: 'digest',
        basic: null,
        bearer: null,
        awsv4: null,
        apikey: null,
        oauth2: null,
        digest: { username: 'testuser', password: 'testpass' }
      },
      headers: [
        {
          uid: 'mockeduuidvalue123456',
          name: 'Content-Type',
          value: 'application/json',
          description: undefined,
          enabled: true
        }
      ],
      params: [
        {
          uid: 'mockeduuidvalue123456',
          name: 'request_qp_1',
          value: '1',
          description: undefined,
          type: 'query',
          enabled: true
        },
        {
          uid: 'mockeduuidvalue123456',
          name: 'request_qp_2',
          value: '2',
          description: undefined,
          type: 'query',
          enabled: true
        },
        {
          uid: 'mockeduuidvalue123456',
          name: 'request_qp_3',
          value: '3',
          description: undefined,
          type: 'query',
          enabled: true
        }
      ],
      body: {
        mode: 'json',
        json: '{\n    "alphabets": "abcdefghijklmnopqrstuvwxyz"\n}',
        text: null,
        xml: null,
        formUrlEncoded: [],
        multipartForm: []
      },
      docs: '',
      script: { req: 'console.log("request level pre-request script");' },
      tests: 'console.log("request level post-request script")'
    });
    expect(rootRequest.seq).toBe(1);
  });
});
