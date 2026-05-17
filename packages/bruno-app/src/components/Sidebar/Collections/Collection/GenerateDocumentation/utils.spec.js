import { resolveInheritedAuthForDocumentation } from './utils';

describe('resolveInheritedAuthForDocumentation', () => {
  it('resolves request auth inherited from a parent folder', () => {
    const collection = {
      root: {
        request: {
          auth: { mode: 'none' }
        }
      },
      items: [
        {
          uid: 'folder-1',
          type: 'folder',
          root: {
            request: {
              auth: {
                mode: 'bearer',
                bearer: { token: '{{token}}' }
              }
            }
          },
          items: [
            {
              uid: 'request-1',
              type: 'http-request',
              request: {
                auth: { mode: 'inherit' }
              }
            }
          ]
        }
      ]
    };

    resolveInheritedAuthForDocumentation(collection);

    expect(collection.items[0].items[0].request.auth).toEqual({
      mode: 'bearer',
      bearer: { token: '{{token}}' }
    });
  });

  it('leaves explicit request auth unchanged', () => {
    const requestAuth = {
      mode: 'apikey',
      apikey: { key: 'x-api-key', value: '{{key}}', placement: 'header' }
    };
    const collection = {
      root: {
        request: {
          auth: { mode: 'bearer', bearer: { token: '{{token}}' } }
        }
      },
      items: [
        {
          uid: 'request-1',
          type: 'http-request',
          request: {
            auth: requestAuth
          }
        }
      ]
    };

    resolveInheritedAuthForDocumentation(collection);

    expect(collection.items[0].request.auth).toBe(requestAuth);
  });
});
