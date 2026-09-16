const { describe, it, expect } = require('@jest/globals');
const { getEffectiveTagsByPathname } = require('../../../src/utils/collection');

const request = (pathname, tags) => ({
  name: pathname.split('/').pop(),
  pathname: `/collection/${pathname}.bru`,
  type: 'http-request',
  ...(tags !== undefined ? { tags } : {})
});

describe('getEffectiveTagsByPathname', () => {
  it('returns an empty map for a collection with no items', () => {
    expect(getEffectiveTagsByPathname({ items: [] }).size).toBe(0);
  });

  it('keeps a request without tags at an empty list', () => {
    const tagsByPathname = getEffectiveTagsByPathname({ items: [request('untagged')] });

    expect(tagsByPathname.get('/collection/untagged.bru')).toEqual([]);
  });

  it('maps a root-level request to its own tags', () => {
    const tagsByPathname = getEffectiveTagsByPathname({ items: [request('smoke', ['smoke', 'fast'])] });

    expect(tagsByPathname.get('/collection/smoke.bru')).toEqual(['smoke', 'fast']);
  });

  it('cascades folder tags to requests inside the folder', () => {
    const collection = {
      items: [
        {
          name: 'auth',
          pathname: '/collection/auth',
          type: 'folder',
          root: { meta: { name: 'auth', tags: ['auth'] } },
          items: [
            {
              name: 'login',
              pathname: '/collection/auth/login.bru',
              type: 'http-request',
              tags: ['smoke']
            }
          ]
        }
      ]
    };

    const tagsByPathname = getEffectiveTagsByPathname(collection);

    expect(tagsByPathname.get('/collection/auth')).toEqual(['auth']);
    expect(tagsByPathname.get('/collection/auth/login.bru')).toEqual(['smoke', 'auth']);
  });

  it('accumulates tags down a nested folder chain', () => {
    const collection = {
      items: [
        {
          name: 'api',
          pathname: '/collection/api',
          type: 'folder',
          root: { meta: { name: 'api', tags: ['api'] } },
          items: [
            {
              name: 'v2',
              pathname: '/collection/api/v2',
              type: 'folder',
              root: { meta: { name: 'v2', tags: ['v2'] } },
              items: [
                {
                  name: 'users',
                  pathname: '/collection/api/v2/users.bru',
                  type: 'http-request',
                  tags: ['smoke']
                }
              ]
            }
          ]
        }
      ]
    };

    const tagsByPathname = getEffectiveTagsByPathname(collection);

    expect(tagsByPathname.get('/collection/api')).toEqual(['api']);
    expect(tagsByPathname.get('/collection/api/v2')).toEqual(['api', 'v2']);
    expect(tagsByPathname.get('/collection/api/v2/users.bru')).toEqual(['smoke', 'api', 'v2']);
  });

  it('does not leak tags across sibling folders', () => {
    const collection = {
      items: [
        {
          name: 'auth',
          pathname: '/collection/auth',
          type: 'folder',
          root: { meta: { name: 'auth', tags: ['auth'] } },
          items: [request('auth/login')]
        },
        {
          name: 'billing',
          pathname: '/collection/billing',
          type: 'folder',
          root: { meta: { name: 'billing', tags: ['billing'] } },
          items: [
            {
              name: 'invoice',
              pathname: '/collection/billing/invoice.bru',
              type: 'http-request'
            }
          ]
        },
        request('standalone', ['root'])
      ]
    };

    const tagsByPathname = getEffectiveTagsByPathname(collection);

    expect(tagsByPathname.get('/collection/auth/login.bru')).toEqual(['auth']);
    expect(tagsByPathname.get('/collection/billing/invoice.bru')).toEqual(['billing']);
    expect(tagsByPathname.get('/collection/standalone.bru')).toEqual(['root']);
  });

  it('de-duplicates a tag a request repeats from its folder', () => {
    const collection = {
      items: [
        {
          name: 'auth',
          pathname: '/collection/auth',
          type: 'folder',
          root: { meta: { name: 'auth', tags: ['auth', 'smoke'] } },
          items: [
            {
              name: 'login',
              pathname: '/collection/auth/login.bru',
              type: 'http-request',
              tags: ['smoke']
            }
          ]
        }
      ]
    };

    expect(getEffectiveTagsByPathname(collection).get('/collection/auth/login.bru')).toEqual(['smoke', 'auth']);
  });

  it('normalizes malformed tags - trims, drops non-strings and de-duplicates', () => {
    const collection = {
      items: [
        {
          name: 'auth',
          pathname: '/collection/auth',
          type: 'folder',
          root: { meta: { name: 'auth', tags: ['  auth  ', 'auth', 42, null, ''] } },
          items: [
            {
              name: 'login',
              pathname: '/collection/auth/login.bru',
              type: 'http-request',
              tags: [' smoke', { name: 'nope' }, undefined]
            }
          ]
        }
      ]
    };

    const tagsByPathname = getEffectiveTagsByPathname(collection);

    expect(tagsByPathname.get('/collection/auth')).toEqual(['auth']);
    expect(tagsByPathname.get('/collection/auth/login.bru')).toEqual(['smoke', 'auth']);
  });

  it('treats non-array tags as no tags', () => {
    const collection = {
      items: [
        {
          name: 'auth',
          pathname: '/collection/auth',
          type: 'folder',
          root: { meta: { name: 'auth', tags: 'auth' } },
          items: [request('auth/login', 'smoke')]
        }
      ]
    };

    const tagsByPathname = getEffectiveTagsByPathname(collection);

    expect(tagsByPathname.get('/collection/auth')).toEqual([]);
    expect(tagsByPathname.get('/collection/auth/login.bru')).toEqual([]);
  });

  it('maps an empty folder without touching its children', () => {
    const collection = {
      items: [
        {
          name: 'empty',
          pathname: '/collection/empty',
          type: 'folder',
          root: { meta: { name: 'empty', tags: ['empty'] } },
          items: []
        }
      ]
    };

    const tagsByPathname = getEffectiveTagsByPathname(collection);

    expect(tagsByPathname.size).toBe(1);
    expect(tagsByPathname.get('/collection/empty')).toEqual(['empty']);
  });
});
