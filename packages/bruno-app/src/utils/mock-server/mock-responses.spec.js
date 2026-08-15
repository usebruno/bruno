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
  cloneMockResponseRecord,
  getMockResponseDescriptionError,
  getMockResponseNameError,
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
      expect(getMockResponseNameError('')).toBe('Mock response name is required');
      expect(getMockResponseNameError('   ')).toBe('Mock response name is required');
      expect(getMockResponseNameError(null)).toBe('Mock response name is required');
      expect(getMockResponseNameError(undefined)).toBe('Mock response name is required');
    });

    it('flags names longer than the max length after trimming', () => {
      const overflow = 'a'.repeat(MOCK_RESPONSE_NAME_MAX_LENGTH + 1);
      expect(getMockResponseNameError(overflow))
        .toBe(`Name must be ${MOCK_RESPONSE_NAME_MAX_LENGTH} characters or less`);
    });

    it('accepts names within bounds', () => {
      expect(getMockResponseNameError('Order 200')).toBeNull();
      expect(getMockResponseNameError('a'.repeat(MOCK_RESPONSE_NAME_MAX_LENGTH))).toBeNull();
      // trailing spaces are ignored — they get trimmed on save
      expect(getMockResponseNameError('Order 200   ')).toBeNull();
    });

    it('measures the trimmed length, not the raw length', () => {
      const paddedAtLimit = `   ${'a'.repeat(MOCK_RESPONSE_NAME_MAX_LENGTH)}   `;
      const paddedOverLimit = `   ${'a'.repeat(MOCK_RESPONSE_NAME_MAX_LENGTH + 1)}   `;
      expect(getMockResponseNameError(paddedAtLimit)).toBeNull();
      expect(getMockResponseNameError(paddedOverLimit))
        .toBe(`Name must be ${MOCK_RESPONSE_NAME_MAX_LENGTH} characters or less`);
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
