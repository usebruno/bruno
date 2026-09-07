import { describe, it, expect } from '@jest/globals';
import { brunoToOpenCollection } from '../../src/opencollection/bruno-to-opencollection';
import { openCollectionToBruno } from '../../src/opencollection/opencollection-to-bruno';

describe('opencollection post-response variables (actions)', () => {
  it('round-trips collection, folder, and request pre- and post-response vars (Bruno -> OpenCollection -> Bruno)', () => {
    const brunoCollection = {
      uid: 'c1',
      name: 'Vars',
      version: '1',
      root: {
        request: {
          vars: {
            req: [{ uid: 'cr1', name: 'baseUrl', value: 'https://api.example.com', enabled: true }],
            res: [
              { uid: 'cp1', name: 'token', value: 'res.body.token', enabled: true, description: 'Auth token' },
              { uid: 'cp2', name: 'userId', value: 'res.body.id', enabled: false, local: true }
            ]
          }
        }
      },
      items: [
        {
          uid: 'f1',
          type: 'folder',
          name: 'Auth',
          seq: 1,
          root: {
            request: {
              vars: {
                req: [{ uid: 'fr1', name: 'authPath', value: '/oauth', enabled: true }],
                res: [{ uid: 'fp1', name: 'refresh', value: 'res.body.refresh', enabled: true }]
              }
            }
          },
          items: [
            {
              uid: 'r1',
              type: 'http-request',
              name: 'Login',
              seq: 1,
              request: {
                method: 'POST',
                url: 'https://api.example.com/login',
                headers: [],
                vars: {
                  req: [{ uid: 'rr1', name: 'grant', value: 'password', enabled: true }],
                  res: [{ uid: 'rp1', name: 'sessionId', value: 'res.body.session', enabled: true }]
                }
              }
            }
          ]
        }
      ]
    };

    const oc = brunoToOpenCollection(brunoCollection);

    expect(oc.request.variables).toEqual([{ name: 'baseUrl', value: 'https://api.example.com' }]);
    expect(oc.request.actions).toEqual([
      {
        type: 'set-variable',
        phase: 'after-response',
        selector: { expression: 'res.body.token', method: 'jsonq' },
        variable: { name: 'token', scope: 'runtime' },
        description: 'Auth token'
      },
      {
        type: 'set-variable',
        phase: 'after-response',
        selector: { expression: 'res.body.id', method: 'jsonq' },
        variable: { name: 'userId', scope: 'request' },
        disabled: true
      }
    ]);

    expect(oc.items[0].request.variables).toEqual([{ name: 'authPath', value: '/oauth' }]);
    expect(oc.items[0].request.actions).toEqual([
      {
        type: 'set-variable',
        phase: 'after-response',
        selector: { expression: 'res.body.refresh', method: 'jsonq' },
        variable: { name: 'refresh', scope: 'runtime' }
      }
    ]);

    const back = openCollectionToBruno(oc);

    expect(back.root.request.vars.req[0]).toMatchObject({ name: 'baseUrl', value: 'https://api.example.com' });
    expect(back.root.request.vars.res).toHaveLength(2);
    expect(back.root.request.vars.res[0]).toMatchObject({
      name: 'token',
      value: 'res.body.token',
      enabled: true,
      local: false,
      description: 'Auth token'
    });
    expect(back.root.request.vars.res[1]).toMatchObject({
      name: 'userId',
      value: 'res.body.id',
      enabled: false,
      local: true
    });

    const folder = back.items[0];
    expect(folder.root.request.vars.req[0]).toMatchObject({ name: 'authPath', value: '/oauth' });
    expect(folder.root.request.vars.res).toHaveLength(1);
    expect(folder.root.request.vars.res[0]).toMatchObject({ name: 'refresh', value: 'res.body.refresh', enabled: true });

    const request = folder.items[0];
    expect(request.request.vars.req[0]).toMatchObject({ name: 'grant', value: 'password' });
    expect(request.request.vars.res).toHaveLength(1);
    expect(request.request.vars.res[0]).toMatchObject({ name: 'sessionId', value: 'res.body.session', enabled: true });
  });

  it('emits the request block when a root has only post-response vars (no pre-request vars/headers/auth/scripts)', () => {
    const brunoCollection = {
      uid: 'c2',
      name: 'OnlyRes',
      version: '1',
      root: {
        request: {
          vars: {
            req: [],
            res: [{ uid: 'cp1', name: 'token', value: 'res.body.token', enabled: true }]
          }
        }
      },
      items: [
        {
          uid: 'f2',
          type: 'folder',
          name: 'F',
          seq: 1,
          root: {
            request: {
              vars: {
                req: [],
                res: [{ uid: 'fp1', name: 'fv', value: 'res.body.fv', enabled: true }]
              }
            }
          }
        }
      ]
    };

    const oc = brunoToOpenCollection(brunoCollection);

    expect(oc.request).toBeDefined();
    expect(oc.request.actions).toHaveLength(1);
    expect(oc.request.variables).toBeUndefined();

    expect(oc.items[0].request).toBeDefined();
    expect(oc.items[0].request.actions).toHaveLength(1);
    expect(oc.items[0].request.variables).toBeUndefined();

    const back = openCollectionToBruno(oc);

    expect(back.root.request.vars.res).toHaveLength(1);
    expect(back.root.request.vars.res[0]).toMatchObject({ name: 'token', value: 'res.body.token', enabled: true });
    expect(back.items[0].root.request.vars.res).toHaveLength(1);
    expect(back.items[0].root.request.vars.res[0]).toMatchObject({ name: 'fv', value: 'res.body.fv', enabled: true });
  });

  it('restores post-response vars from actions and re-exports them (OpenCollection -> Bruno -> OpenCollection)', () => {
    const openCollection = {
      opencollection: '1.0.0',
      info: { name: 'OC' },
      request: {
        actions: [
          {
            type: 'set-variable',
            phase: 'after-response',
            selector: { expression: 'res.body.token', method: 'jsonq' },
            variable: { name: 'token', scope: 'runtime' }
          }
        ]
      },
      items: [
        {
          info: { name: 'F', type: 'folder' },
          request: {
            actions: [
              {
                type: 'set-variable',
                phase: 'after-response',
                selector: { expression: 'res.body.fv', method: 'jsonq' },
                variable: { name: 'fv', scope: 'request' },
                disabled: true
              }
            ]
          }
        }
      ]
    };

    const bruno = openCollectionToBruno(openCollection);

    expect(bruno.root.request.vars.res).toHaveLength(1);
    expect(bruno.root.request.vars.res[0]).toMatchObject({ name: 'token', value: 'res.body.token', enabled: true, local: false });
    expect(bruno.items[0].root.request.vars.res).toHaveLength(1);
    expect(bruno.items[0].root.request.vars.res[0]).toMatchObject({ name: 'fv', value: 'res.body.fv', enabled: false, local: true });

    const backOC = brunoToOpenCollection(bruno);

    expect(backOC.request.actions).toEqual([
      {
        type: 'set-variable',
        phase: 'after-response',
        selector: { expression: 'res.body.token', method: 'jsonq' },
        variable: { name: 'token', scope: 'runtime' }
      }
    ]);
    expect(backOC.items[0].request.actions).toEqual([
      {
        type: 'set-variable',
        phase: 'after-response',
        selector: { expression: 'res.body.fv', method: 'jsonq' },
        variable: { name: 'fv', scope: 'request' },
        disabled: true
      }
    ]);
  });
});
