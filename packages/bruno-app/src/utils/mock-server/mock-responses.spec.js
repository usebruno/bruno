jest.mock('utils/common', () => {
  let counter = 0;

  return {
    uuid: () => {
      counter += 1;
      return `mock-uid-${counter}`;
    }
  };
});

import {
  buildDemoRequestFromRules,
  cloneMockResponseRecord,
  getMockResponseDescriptionError,
  getMockResponseNameError,
  getMockResponseNameInputError,
  isMockResponseNameTaken,
  MOCK_RESPONSE_DESCRIPTION_MAX_LENGTH,
  MOCK_RESPONSE_NAME_MAX_LENGTH,
  resolveMockResponseCollection,
  resolveMockResponseEditorCollection
} from './mock-responses';

describe('mock-responses', () => {
  it('clones mock responses with new uids and a copy name', () => {
    const source = {
      uid: 'response-1',
      name: 'List products',
      request: {
        url: '/products',
        method: 'GET',
        headers: [{ uid: 'header-1', name: 'Accept', value: 'application/json' }],
        params: [{ uid: 'param-1', name: 'category', value: 'books' }]
      },
      response: {
        status: 200,
        headers: [{ uid: 'header-2', name: 'Content-Type', value: 'application/json' }],
        body: { type: 'json', content: '[]' }
      },
      rules: {
        operator: 'AND',
        conditions: [{ uid: 'rule-1', type: 'header', key: 'Authorization', operator: 'equals', value: 'token' }]
      }
    };

    const cloned = cloneMockResponseRecord(source);

    expect(cloned.uid).not.toBe(source.uid);
    expect(cloned.name).toBe('List products copy');
    expect(cloned.request.headers[0].uid).not.toBe('header-1');
    expect(cloned.request.params[0].uid).not.toBe('param-1');
    expect(cloned.response.headers[0].uid).not.toBe('header-2');
    expect(cloned.rules.conditions[0].uid).not.toBe('rule-1');
  });

  it('uses a custom clone name when provided', () => {
    const cloned = cloneMockResponseRecord({ uid: 'response-1', name: 'Users' }, { name: 'Users duplicate' });
    expect(cloned.name).toBe('Users duplicate');
  });
});

describe('resolveMockResponseCollection', () => {
  const collections = [
    { uid: 'collection-1', name: 'Shop' },
    { uid: 'scratch-1', name: 'Scratch', environments: [{ uid: 'env-1', variables: [] }] }
  ];

  it('prefers the provided collection', () => {
    const collection = { uid: 'collection-1', name: 'Shop' };
    expect(resolveMockResponseCollection({
      collection,
      instance: { collectionUid: 'other' },
      collections
    })).toBe(collection);
  });

  it('falls back to the mock server collection uid', () => {
    expect(resolveMockResponseCollection({
      collection: null,
      instance: { collectionUid: 'collection-1' },
      collections
    })).toEqual(collections[0]);
  });

  it('falls back to the workspace scratch collection for spec mock servers', () => {
    expect(resolveMockResponseCollection({
      collection: null,
      instance: { sourceType: 'spec' },
      collections,
      activeWorkspace: { scratchCollectionUid: 'scratch-1' }
    })).toEqual(collections[1]);
  });
});

describe('resolveMockResponseEditorCollection', () => {
  it('merges global and collection environment context for variable resolution', () => {
    const enriched = resolveMockResponseEditorCollection({
      collection: {
        uid: 'collection-1',
        name: 'Shop',
        activeEnvironmentUid: 'env-1',
        environments: [{
          uid: 'env-1',
          variables: [{ uid: 'var-1', name: 'baseUrl', value: 'https://api.example.com', enabled: true }]
        }]
      },
      globalEnvironments: [{
        uid: 'global-env-1',
        variables: [{ uid: 'global-var-1', name: 'token', value: 'abc', enabled: true }]
      }],
      activeGlobalEnvironmentUid: 'global-env-1',
      activeWorkspace: {
        processEnvVariables: { NODE_ENV: 'test' }
      }
    });

    expect(enriched.globalEnvironmentVariables).toEqual({ token: 'abc' });
    expect(enriched.workspaceProcessEnvVariables).toEqual({ NODE_ENV: 'test' });
    expect(enriched.environments[0].variables[0].value).toBe('https://api.example.com');
  });

  describe('getMockResponseNameError', () => {
    it('flags empty and whitespace-only names', () => {
      expect(getMockResponseNameError('')).toBe('Name cannot be empty.');
      expect(getMockResponseNameError('   ')).toBe('Name cannot be empty.');
      expect(getMockResponseNameError(null)).toBe('Name cannot be empty.');
      expect(getMockResponseNameError(undefined)).toBe('Name cannot be empty.');
    });

    it('flags names longer than the max length after trimming', () => {
      const overflow = 'a'.repeat(MOCK_RESPONSE_NAME_MAX_LENGTH + 1);
      expect(getMockResponseNameError(overflow)).toBe('Name cannot exceed 255 characters.');
    });

    it('rejects Bruno-disallowed special characters', () => {
      expect(getMockResponseNameError('bad/name'))
        .toBe('Special characters aren\'t allowed in the name. Invalid character \'/\'.');
      expect(getMockResponseNameError('what?'))
        .toBe('Special characters aren\'t allowed in the name. Invalid character \'?\'.');
    });

    it('rejects Windows reserved device names', () => {
      expect(getMockResponseNameError('CON')).toBe('Name cannot be a reserved device name.');
      expect(getMockResponseNameError('com1')).toBe('Name cannot be a reserved device name.');
    });

    it('accepts names within bounds', () => {
      expect(getMockResponseNameError('Order 200')).toBeNull();
      expect(getMockResponseNameError('#$$@##$#@')).toBeNull();
      expect(getMockResponseNameError('a'.repeat(MOCK_RESPONSE_NAME_MAX_LENGTH))).toBeNull();
      // trailing spaces are ignored — they get trimmed on save
      expect(getMockResponseNameError('Order 200   ')).toBeNull();
    });

    it('measures the trimmed length, not the raw length', () => {
      const paddedAtLimit = `   ${'a'.repeat(MOCK_RESPONSE_NAME_MAX_LENGTH)}   `;
      const paddedOverLimit = `   ${'a'.repeat(MOCK_RESPONSE_NAME_MAX_LENGTH + 1)}   `;
      expect(getMockResponseNameError(paddedAtLimit)).toBeNull();
      expect(getMockResponseNameError(paddedOverLimit)).toBe('Name cannot exceed 255 characters.');
    });
  });

  describe('getMockResponseNameInputError', () => {
    it('stays quiet for empty and whitespace-only values so the input does not flash while typing', () => {
      expect(getMockResponseNameInputError('')).toBeNull();
      expect(getMockResponseNameInputError('   ')).toBeNull();
      expect(getMockResponseNameInputError(null)).toBeNull();
    });

    it('still surfaces character, length and reserved-name violations', () => {
      expect(getMockResponseNameInputError('bad/name'))
        .toBe('Special characters aren\'t allowed in the name. Invalid character \'/\'.');
      expect(getMockResponseNameInputError('a'.repeat(MOCK_RESPONSE_NAME_MAX_LENGTH + 1)))
        .toBe('Name cannot exceed 255 characters.');
      expect(getMockResponseNameInputError('CON')).toBe('Name cannot be a reserved device name.');
    });
  });

  describe('getMockResponseDescriptionError', () => {
    it('flags descriptions longer than the max length after trimming', () => {
      const overflow = 'a'.repeat(MOCK_RESPONSE_DESCRIPTION_MAX_LENGTH + 1);
      expect(getMockResponseDescriptionError(overflow))
        .toBe(`Description must be ${MOCK_RESPONSE_DESCRIPTION_MAX_LENGTH} characters or less`);
    });

    it('accepts empty and in-bounds descriptions', () => {
      expect(getMockResponseDescriptionError('')).toBeNull();
      expect(getMockResponseDescriptionError(null)).toBeNull();
      expect(getMockResponseDescriptionError('a'.repeat(MOCK_RESPONSE_DESCRIPTION_MAX_LENGTH))).toBeNull();
    });
  });

  describe('isMockResponseNameTaken', () => {
    const responses = [
      { uid: 'r-1', name: 'Success' },
      { uid: 'r-2', name: '  Not Found  ' }
    ];

    it('detects duplicates case-insensitively and ignores surrounding whitespace', () => {
      expect(isMockResponseNameTaken(responses, 'success')).toBe(true);
      expect(isMockResponseNameTaken(responses, 'SUCCESS')).toBe(true);
      expect(isMockResponseNameTaken(responses, '  Success  ')).toBe(true);
      expect(isMockResponseNameTaken(responses, 'not found')).toBe(true);
    });

    it('excludes the record being renamed', () => {
      expect(isMockResponseNameTaken(responses, 'success', 'r-1')).toBe(false);
    });

    it('returns false for empty or missing names', () => {
      expect(isMockResponseNameTaken(responses, '')).toBe(false);
      expect(isMockResponseNameTaken(responses, '   ')).toBe(false);
      expect(isMockResponseNameTaken(responses, null)).toBe(false);
    });

    it('handles an empty response list', () => {
      expect(isMockResponseNameTaken([], 'anything')).toBe(false);
      expect(isMockResponseNameTaken(undefined, 'anything')).toBe(false);
    });
  });
});

describe('buildDemoRequestFromRules', () => {
  const request = { url: '{{baseUrl}}/users/:id', method: 'get' };

  it('derives headers, params and a json body from the rules', () => {
    const demo = buildDemoRequestFromRules(request, {
      operator: 'AND',
      conditions: [
        { target: 'header', key: 'Authorization', operator: 'equals', value: 'token' },
        { target: 'query', key: 'page', operator: 'contains', value: '2' },
        { target: 'body', key: '$.user.type', operator: 'equals', value: 'admin' },
        { target: 'body', key: 'user.plan', operator: 'equals', value: 'pro' }
      ]
    });

    expect(demo.url).toBe('/users/:id');
    expect(demo.method).toBe('GET');
    expect(demo.headers).toEqual([{ name: 'Authorization', value: 'token', enabled: true }]);
    expect(demo.params).toEqual([{ name: 'page', value: '2', type: 'query', enabled: true }]);
    expect(JSON.parse(demo.body.content)).toEqual({ user: { type: 'admin', plan: 'pro' } });
    expect(demo.body.mode).toBe('json');
  });

  it('generates a sample that satisfies matches patterns instead of echoing them', () => {
    const patterns = [
      '^\\d+$',
      '^user-\\d{3}$',
      '^(cat|dog)s?$',
      '^[a-f0-9]{4}$',
      'v\\d+\\.\\d+'
    ];

    patterns.forEach((pattern) => {
      const demo = buildDemoRequestFromRules(request, {
        operator: 'AND',
        conditions: [{ target: 'header', key: 'X-Match', operator: 'matches', value: pattern }]
      });

      expect(new RegExp(pattern).test(demo.headers[0].value)).toBe(true);
    });
  });

  it('falls back to the raw value for unsatisfiable matches patterns', () => {
    const demo = buildDemoRequestFromRules(request, {
      operator: 'AND',
      conditions: [
        { target: 'header', key: 'X-Bad', operator: 'matches', value: '(' },
        { target: 'query', key: 'plain', operator: 'matches', value: 'literal' }
      ]
    });

    expect(demo.headers[0].value).toBe('(');
    expect(demo.params[0].value).toBe('literal');
    expect(new RegExp('literal').test(demo.params[0].value)).toBe(true);
  });

  it('uses an empty sample for not_equals and skips keyless conditions', () => {
    const demo = buildDemoRequestFromRules(request, {
      operator: 'OR',
      conditions: [
        { target: 'header', key: 'X-Env', operator: 'not_equals', value: 'prod' },
        { target: 'query', key: '', operator: 'equals', value: 'ignored' }
      ]
    });

    expect(demo.headers).toEqual([{ name: 'X-Env', value: '', enabled: true }]);
    expect(demo.params).toEqual([]);
    expect(demo.body).toBeNull();
  });

  it('returns a bare request when there are no rules', () => {
    const demo = buildDemoRequestFromRules(request, { operator: 'AND', conditions: [] });

    expect(demo).toEqual({
      url: '/users/:id',
      method: 'GET',
      headers: [],
      params: [],
      body: null
    });
  });
});
