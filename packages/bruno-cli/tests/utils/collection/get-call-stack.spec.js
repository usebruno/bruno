const { describe, it, expect, beforeEach } = require('@jest/globals');
const { getCallStack } = require('../../../src/utils/collection');

const collection = {
  brunoConfig: {
    version: '1',
    name: 'multirun-cli',
    type: 'collection',
    ignore: ['node_modules', '.git']
  },
  root: {
    request: {
      headers: [],
      auth: {},
      script: {},
      vars: {},
      tests: ''
    }
  },
  pathname: '/Users/tempo/Downloads/t-temp/multirun-cli-20',
  items: [
    {
      name: 'root-folder',
      pathname: '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-folder',
      type: 'folder',
      items: [
        {
          name: 'root-child-folder',
          pathname: '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-folder/root-child-folder',
          type: 'folder',
          items: [
            {
              name: 'root-child-child-folder',
              pathname:
                '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-folder/root-child-folder/root-child-child-folder',
              type: 'folder',
              items: [
                {
                  name: 'root-child-child-child-req-0',
                  pathname:
                    '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-folder/root-child-folder/root-child-child-folder/root-child-child-child-req-0.bru',
                  type: 'http-request',
                  seq: 1,
                  request: {
                    method: 'GET',
                    url: 'https://g.cn',
                    auth: {
                      mode: 'inherit'
                    },
                    params: [],
                    headers: [],
                    body: {
                      mode: 'none'
                    },
                    vars: [],
                    assertions: [],
                    script: {
                      req: 'console.log("root-child-child-child-file-0")'
                    },
                    tests: ''
                  }
                },
                {
                  name: 'root-child-child-child-req-1',
                  pathname:
                    '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-folder/root-child-folder/root-child-child-folder/root-child-child-child-req-1.bru',
                  type: 'http-request',
                  seq: 2,
                  request: {
                    method: 'GET',
                    url: 'https://g.cn',
                    auth: {
                      mode: 'inherit'
                    },
                    params: [],
                    headers: [],
                    body: {
                      mode: 'none'
                    },
                    vars: [],
                    assertions: [],
                    script: {
                      req: 'console.log("root-child-child-child-file-1")'
                    },
                    tests: ''
                  }
                }
              ],
              root: {
                request: {
                  headers: [],
                  auth: {},
                  script: {},
                  vars: {},
                  tests: ''
                },
                meta: {
                  name: 'root-child-child-folder',
                  seq: 3
                }
              },
              seq: 3
            },
            {
              name: 'root-child-child-req-0',
              pathname:
                '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-folder/root-child-folder/root-child-child-req-0.bru',
              type: 'http-request',
              seq: 4,
              request: {
                method: 'GET',
                url: 'https://g.cn',
                auth: {
                  mode: 'inherit'
                },
                params: [],
                headers: [],
                body: {
                  mode: 'none'
                },
                vars: [],
                assertions: [],
                script: {
                  req: 'console.log("root-child-child-file-0")'
                },
                tests: ''
              }
            },
            {
              name: 'root-child-child-req-1',
              pathname:
                '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-folder/root-child-folder/root-child-child-req-1.bru',
              type: 'http-request',
              seq: 5,
              request: {
                method: 'GET',
                url: 'https://g.cn',
                auth: {
                  mode: 'inherit'
                },
                params: [],
                headers: [],
                body: {
                  mode: 'none'
                },
                vars: [],
                assertions: [],
                script: {
                  req: 'console.log("root-child-child-file-1")'
                },
                tests: ''
              }
            }
          ],
          root: {
            request: {
              headers: [],
              auth: {},
              script: {},
              vars: {},
              tests: ''
            },
            meta: {
              name: 'root-child-folder',
              seq: 6
            }
          },
          seq: 6
        },
        {
          name: 'root-child-req-0',
          pathname: '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-folder/root-child-req-0.bru',
          type: 'http-request',
          seq: 7,
          request: {
            method: 'GET',
            url: 'https://g.cn',
            auth: {
              mode: 'inherit'
            },
            params: [],
            headers: [],
            body: {
              mode: 'none'
            },
            vars: [],
            assertions: [],
            script: {
              req: 'console.log("root-child-file-0")'
            },
            tests: ''
          }
        },
        {
          name: 'root-child-req-1',
          pathname: '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-folder/root-child-req-1.bru',
          type: 'http-request',
          seq: 8,
          request: {
            method: 'GET',
            url: 'https://g.cn',
            auth: {
              mode: 'inherit'
            },
            params: [],
            headers: [],
            body: {
              mode: 'none'
            },
            vars: [],
            assertions: [],
            script: {
              req: 'console.log("root-child-file-1")'
            },
            tests: ''
          }
        }
      ],
      root: {
        request: {
          headers: [],
          auth: {},
          script: {},
          vars: {},
          tests: ''
        },
        meta: {
          name: 'root-folder',
          seq: 9
        }
      },
      seq: 9
    },
    {
      name: 'root-req-0',
      pathname: '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-req-0.bru',
      type: 'http-request',
      seq: 10,
      request: {
        method: 'GET',
        url: 'https://g.cn',
        auth: {
          mode: 'inherit'
        },
        params: [],
        headers: [],
        body: {
          mode: 'none'
        },
        vars: [],
        assertions: [],
        script: {
          req: 'console.log("root-file-0")'
        },
        tests: ''
      }
    },
    {
      name: 'root-req-1',
      pathname: '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-req-1.bru',
      type: 'http-request',
      seq: 11,
      request: {
        method: 'GET',
        url: 'https://g.cn',
        auth: {
          mode: 'inherit'
        },
        params: [],
        headers: [],
        body: {
          mode: 'none'
        },
        vars: [],
        assertions: [],
        script: {
          req: 'console.log("root-file-1")'
        },
        tests: ''
      }
    },
    {
      name: 'root-req-2',
      pathname: '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-req-2.bru',
      type: 'http-request',
      seq: 12,
      request: {
        method: 'GET',
        url: 'https://g.cn',
        auth: {
          mode: 'inherit'
        },
        params: [],
        headers: [],
        body: {
          mode: 'none'
        },
        vars: [],
        assertions: [],
        script: {
          req: 'console.log("root-file-2")'
        },
        tests: ''
      }
    }
  ]
};

const sequenceChangedCollection = {
  brunoConfig: {
    version: '1',
    name: 'sequenceChangedCollection',
    type: 'collection',
    ignore: ['node_modules', '.git']
  },
  root: {},
  pathname: '/Users/tempo/Downloads/t-temp/sequenceChangedCollection',
  items: [
    {
      name: 'three',
      pathname: '/Users/tempo/Downloads/t-temp/sequenceChangedCollection/three.bru',
      type: 'http-request',
      seq: 1,
      request: {
        method: 'GET',
        url: 'https://usebruno.com',
        auth: {
          mode: 'inherit'
        },
        params: [],
        headers: [],
        body: {
          mode: 'none'
        },
        vars: [],
        assertions: [],
        script: {},
        tests: ''
      }
    },
    {
      name: 'one',
      pathname: '/Users/tempo/Downloads/t-temp/sequenceChangedCollection/one.bru',
      type: 'http-request',
      seq: 2,
      request: {
        method: 'GET',
        url: 'https://usebruno.com',
        auth: {
          mode: 'inherit'
        },
        params: [],
        headers: [],
        body: {
          mode: 'none'
        },
        vars: [],
        assertions: [],
        script: {},
        tests: ''
      }
    },
    {
      name: 'two',
      pathname: '/Users/tempo/Downloads/t-temp/sequenceChangedCollection/two.bru',
      type: 'http-request',
      seq: 2,
      request: {
        method: 'GET',
        url: 'https://usebruno.com',
        auth: {
          mode: 'inherit'
        },
        params: [],
        headers: [],
        body: {
          mode: 'none'
        },
        vars: [],
        assertions: [],
        script: {},
        tests: ''
      }
    }
  ]
};

describe('getCallStack', () => {
  it('should return all requests in the collection', () => {
    const callStack = getCallStack(['/Users/tempo/Downloads/t-temp/multirun-cli-20'], collection, { recursive: true });
    const expectedCallStack = [
      {
        name: 'root-child-child-child-req-0',
        pathname:
          '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-folder/root-child-folder/root-child-child-folder/root-child-child-child-req-0.bru',
        type: 'http-request',
        seq: 1,
        request: {
          method: 'GET',
          url: 'https://g.cn',
          auth: {
            mode: 'inherit'
          },
          params: [],
          headers: [],
          body: {
            mode: 'none'
          },
          vars: [],
          assertions: [],
          script: {
            req: 'console.log("root-child-child-child-file-0")'
          },
          tests: ''
        }
      },
      {
        name: 'root-child-child-child-req-1',
        pathname:
          '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-folder/root-child-folder/root-child-child-folder/root-child-child-child-req-1.bru',
        type: 'http-request',
        seq: 2,
        request: {
          method: 'GET',
          url: 'https://g.cn',
          auth: {
            mode: 'inherit'
          },
          params: [],
          headers: [],
          body: {
            mode: 'none'
          },
          vars: [],
          assertions: [],
          script: {
            req: 'console.log("root-child-child-child-file-1")'
          },
          tests: ''
        }
      },
      {
        name: 'root-child-child-req-0',
        pathname:
          '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-folder/root-child-folder/root-child-child-req-0.bru',
        type: 'http-request',
        seq: 4,
        request: {
          method: 'GET',
          url: 'https://g.cn',
          auth: {
            mode: 'inherit'
          },
          params: [],
          headers: [],
          body: {
            mode: 'none'
          },
          vars: [],
          assertions: [],
          script: {
            req: 'console.log("root-child-child-file-0")'
          },
          tests: ''
        }
      },
      {
        pathname:
          '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-folder/root-child-folder/root-child-child-req-1.bru'
      },
      {
        pathname: '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-folder/root-child-req-0.bru'
      },
      {
        pathname: '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-folder/root-child-req-1.bru'
      },
      {
        pathname: '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-req-0.bru'
      },
      {
        pathname: '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-req-1.bru'
      },
      {
        pathname: '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-req-2.bru'
      }
    ];
    expect(callStack.map((item) => item.pathname)).toEqual(expectedCallStack.map((item) => item.pathname));
  });

  it('should return all requests in the collection when sequence is changed', () => {
    const callStack = getCallStack(
      ['/Users/tempo/Downloads/t-temp/sequenceChangedCollection'],
      sequenceChangedCollection,
      {
        recursive: true
      }
    );
    const expectedCallStack = [
      {
        pathname: '/Users/tempo/Downloads/t-temp/sequenceChangedCollection/three.bru'
      },
      {
        pathname: '/Users/tempo/Downloads/t-temp/sequenceChangedCollection/one.bru'
      },
      {
        pathname: '/Users/tempo/Downloads/t-temp/sequenceChangedCollection/two.bru'
      }
    ];
    expect(callStack.map((item) => item.pathname)).toEqual(expectedCallStack.map((item) => item.pathname));
  });
});

describe('getCallStack with collection sequence changed', () => {
  it('should return an empty array', () => {
    const callStack = getCallStack(
      ['/Users/tempo/Downloads/t-temp/sequenceChangedCollection'],
      sequenceChangedCollection,
      {
        recursive: true
      }
    );
    const expectedCallStack = [
      {
        name: 'three',
        pathname: '/Users/tempo/Downloads/t-temp/sequenceChangedCollection/three.bru',
        type: 'http-request',
        seq: 1,
        request: {
          method: 'GET',
          url: 'https://usebruno.com',
          auth: {
            mode: 'inherit'
          },
          params: [],
          headers: [],
          body: {
            mode: 'none'
          },
          vars: [],
          assertions: [],
          script: {},
          tests: ''
        }
      },
      {
        name: 'one',
        pathname: '/Users/tempo/Downloads/t-temp/sequenceChangedCollection/one.bru',
        type: 'http-request',
        seq: 2,
        request: {
          method: 'GET',
          url: 'https://usebruno.com',
          auth: {
            mode: 'inherit'
          },
          params: [],
          headers: [],
          body: {
            mode: 'none'
          },
          vars: [],
          assertions: [],
          script: {},
          tests: ''
        }
      },
      {
        name: 'two',
        pathname: '/Users/tempo/Downloads/t-temp/sequenceChangedCollection/two.bru',
        type: 'http-request',
        seq: 2,
        request: {
          method: 'GET',
          url: 'https://usebruno.com',
          auth: {
            mode: 'inherit'
          },
          params: [],
          headers: [],
          body: {
            mode: 'none'
          },
          vars: [],
          assertions: [],
          script: {},
          tests: ''
        }
      }
    ];
    expect(callStack).toEqual(expectedCallStack);
  });
});

describe('getCallStack with muliple folders and requests run', () => {
  it('should return an empty array', () => {
    const callStack = getCallStack(
      [
        '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-req-0.bru',
        '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-folder/root-child-folder/root-child-child-req-0.bru',
        '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-req-2.bru'
      ],
      collection,
      {
        recursive: true
      }
    );
    const expectedCallStack = [
      {
        name: 'root-req-0',
        pathname: '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-req-0.bru',
        type: 'http-request',
        seq: 10,
        request: {
          method: 'GET',
          url: 'https://g.cn',
          auth: {
            mode: 'inherit'
          },
          params: [],
          headers: [],
          body: {
            mode: 'none'
          },
          vars: [],
          assertions: [],
          script: {
            req: 'console.log("root-file-0")'
          },
          tests: ''
        }
      },
      {
        name: 'root-child-child-req-0',
        pathname:
          '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-folder/root-child-folder/root-child-child-req-0.bru',
        type: 'http-request',
        seq: 4,
        request: {
          method: 'GET',
          url: 'https://g.cn',
          auth: {
            mode: 'inherit'
          },
          params: [],
          headers: [],
          body: {
            mode: 'none'
          },
          vars: [],
          assertions: [],
          script: {
            req: 'console.log("root-child-child-file-0")'
          },
          tests: ''
        }
      },
      {
        name: 'root-req-2',
        pathname: '/Users/tempo/Downloads/t-temp/multirun-cli-20/root-req-2.bru',
        type: 'http-request',
        seq: 12,
        request: {
          method: 'GET',
          url: 'https://g.cn',
          auth: {
            mode: 'inherit'
          },
          params: [],
          headers: [],
          body: {
            mode: 'none'
          },
          vars: [],
          assertions: [],
          script: {
            req: 'console.log("root-file-2")'
          },
          tests: ''
        }
      }
    ];
    expect(callStack).toEqual(expectedCallStack);
  });
});
