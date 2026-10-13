import { describe, it, expect } from '@jest/globals';
import brunoToPostman from '../../src/postman/bruno-to-postman';

describe('bruno-to-postman disabled system headers export', () => {
  it('should export disabled system headers from omitHeaders setting', () => {
    const brunoCollection = {
      name: 'Test Collection',
      items: [
        {
          uid: '1',
          name: 'Test Request',
          type: 'http-request',
          seq: 1,
          request: {
            url: 'https://api.example.com/test',
            method: 'POST',
            headers: [
              {
                uid: 'h1',
                name: 'Authorization',
                value: 'Bearer token',
                enabled: true
              }
            ],
            params: [],
            auth: {
              mode: 'inherit'
            },
            body: {
              mode: 'none'
            }
          },
          settings: {
            omitHeaders: ['accept', 'user-agent']
          }
        }
      ],
      root: {
        request: {
          auth: {
            mode: 'none'
          },
          headers: []
        }
      }
    };

    const postmanCollection = brunoToPostman(brunoCollection);
    const postmanRequest = postmanCollection.item[0];

    expect(postmanRequest.protocolProfileBehavior).toBeDefined();
    expect(postmanRequest.protocolProfileBehavior.disabledSystemHeaders).toEqual({
      'accept': true,
      'user-agent': true
    });
  });

  it('should not include disabledSystemHeaders when omitHeaders is empty', () => {
    const brunoCollection = {
      name: 'Test Collection',
      items: [
        {
          uid: '1',
          name: 'Test Request',
          type: 'http-request',
          seq: 1,
          request: {
            url: 'https://api.example.com/test',
            method: 'GET',
            headers: [
              {
                uid: 'h1',
                name: 'Custom-Header',
                value: 'value',
                enabled: true
              }
            ],
            params: [],
            auth: {
              mode: 'inherit'
            },
            body: {
              mode: 'none'
            }
          },
          settings: {
            omitHeaders: []
          }
        }
      ],
      root: {
        request: {
          auth: {
            mode: 'none'
          },
          headers: []
        }
      }
    };

    const postmanCollection = brunoToPostman(brunoCollection);
    const postmanRequest = postmanCollection.item[0];

    expect(postmanRequest.protocolProfileBehavior).toBeUndefined();
  });

  it('should handle case-insensitive header names', () => {
    const brunoCollection = {
      name: 'Test Collection',
      items: [
        {
          uid: '1',
          name: 'Test Request',
          type: 'http-request',
          seq: 1,
          request: {
            url: 'https://api.example.com/test',
            method: 'POST',
            headers: [],
            params: [],
            auth: {
              mode: 'inherit'
            },
            body: {
              mode: 'none'
            }
          },
          settings: {
            omitHeaders: ['Accept', 'USER-AGENT', 'cache-control']
          }
        }
      ],
      root: {
        request: {
          auth: {
            mode: 'none'
          },
          headers: []
        }
      }
    };

    const postmanCollection = brunoToPostman(brunoCollection);
    const postmanRequest = postmanCollection.item[0];

    expect(postmanRequest.protocolProfileBehavior).toBeDefined();
    expect(postmanRequest.protocolProfileBehavior.disabledSystemHeaders).toEqual({
      'accept': true,
      'user-agent': true,
      'cache-control': true
    });
  });

  it('should handle requests with no settings', () => {
    const brunoCollection = {
      name: 'Test Collection',
      items: [
        {
          uid: '1',
          name: 'Test Request',
          type: 'http-request',
          seq: 1,
          request: {
            url: 'https://api.example.com/test',
            method: 'GET',
            headers: [],
            params: [],
            auth: {
              mode: 'inherit'
            },
            body: {
              mode: 'none'
            }
          }
        }
      ],
      root: {
        request: {
          auth: {
            mode: 'none'
          },
          headers: []
        }
      }
    };

    const postmanCollection = brunoToPostman(brunoCollection);
    const postmanRequest = postmanCollection.item[0];

    expect(postmanRequest.protocolProfileBehavior).toBeUndefined();
  });

  it('should handle null omitHeaders', () => {
    const brunoCollection = {
      name: 'Test Collection',
      items: [
        {
          uid: '1',
          name: 'Test Request',
          type: 'http-request',
          seq: 1,
          request: {
            url: 'https://api.example.com/test',
            method: 'GET',
            headers: [],
            params: [],
            auth: {
              mode: 'inherit'
            },
            body: {
              mode: 'none'
            }
          },
          settings: {
            omitHeaders: null
          }
        }
      ],
      root: {
        request: {
          auth: {
            mode: 'none'
          },
          headers: []
        }
      }
    };

    const postmanCollection = brunoToPostman(brunoCollection);
    const postmanRequest = postmanCollection.item[0];

    expect(postmanRequest.protocolProfileBehavior).toBeUndefined();
  });
});
