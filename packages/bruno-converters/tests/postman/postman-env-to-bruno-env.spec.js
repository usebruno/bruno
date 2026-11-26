import { describe, it, expect } from '@jest/globals';
import postmanToBrunoEnvironment from '../../src/postman/postman-env-to-bruno-env';

describe('postmanToBrunoEnvironment Function', () => {
  it('should correctly import a valid Postman environment file', async () => {
    const postmanEnvironment = {
      id: 'some-id',
      name: 'My Environment',
      values: [
        {
          key: 'var1',
          value: 'value1',
          enabled: true,
          type: 'text'
        },
        {
          key: 'var2',
          value: 'value2',
          enabled: false,
          type: 'secret'
        }
      ]
    };

    const brunoEnvironment = await postmanToBrunoEnvironment(postmanEnvironment);

    const expectedEnvironment = {
      name: 'My Environment',
      variables: [
        {
          name: 'var1',
          value: 'value1',
          enabled: true,
          secret: false,
          type: 'text',
          uid: 'mockeduuidvalue123456'
        },
        {
          name: 'var2',
          value: 'value2',
          enabled: false,
          secret: true,
          type: 'text',
          uid: 'mockeduuidvalue123456'
        }
      ]
    };

    expect(brunoEnvironment).toEqual(expectedEnvironment);
  });

  it('should handle falsy values in environment variables', async () => {
    const postmanEnvironment = {
      id: 'some-id',
      name: 'My Environment',
      values: [
        {
          enabled: true,
          type: 'text'
        },
        {
          value: '',
          enabled: true,
          type: 'text'
        },
        {
          key: '',
          enabled: true,
          type: 'text'
        },
        {
          key: '',
          value: '',
          enabled: true,
          type: 'text'
        }
      ]
    };

    const brunoEnvironment = await postmanToBrunoEnvironment(postmanEnvironment);

    const expectedEnvironment = {
      name: 'My Environment',
      variables: [
        {
          name: '',
          value: '',
          enabled: true,
          secret: false,
          type: 'text',
          uid: 'mockeduuidvalue123456'
        },
        {
          name: '',
          value: '',
          enabled: true,
          secret: false,
          type: 'text',
          uid: 'mockeduuidvalue123456'
        },
        {
          name: '',
          value: '',
          enabled: true,
          secret: false,
          type: 'text',
          uid: 'mockeduuidvalue123456'
        }
      ]
    };

    expect(brunoEnvironment).toEqual(expectedEnvironment);
  });

  it('should default enabled to true when Postman omits or nulls it', async () => {
    const postmanEnvironment = {
      id: 'some-id',
      name: 'My Environment',
      values: [
        {
          key: 'noEnabled',
          value: 'value1',
          type: 'default'
        },
        {
          key: 'nullEnabled',
          value: 'value2',
          enabled: null,
          type: 'default'
        }
      ]
    };

    const brunoEnvironment = await postmanToBrunoEnvironment(postmanEnvironment);

    const expectedEnvironment = {
      name: 'My Environment',
      variables: [
        {
          name: 'noEnabled',
          value: 'value1',
          enabled: true,
          secret: false,
          type: 'text',
          uid: 'mockeduuidvalue123456'
        },
        {
          name: 'nullEnabled',
          value: 'value2',
          enabled: true,
          secret: false,
          type: 'text',
          uid: 'mockeduuidvalue123456'
        }
      ]
    };

    expect(brunoEnvironment).toEqual(expectedEnvironment);
  });

  it('should mark variables with a "secret: true" flag as secret (current Postman export format)', () => {
    const postmanEnvironment = {
      id: 'dc5fe3c1-cad9-4ecb-989f-1a76bb215906',
      name: 'Prod',
      values: [
        {
          key: 'authtoken',
          type: 'default',
          enabled: true,
          secret: true
        },
        {
          key: 'region',
          value: 'eu',
          type: 'default',
          enabled: true,
          secret: false
        }
      ],
      _postman_variable_scope: 'environment',
      _postman_exported_using: 'Postman/12.34.4'
    };

    const brunoEnvironment = postmanToBrunoEnvironment(postmanEnvironment);

    expect(brunoEnvironment).toEqual({
      name: 'Prod',
      variables: [
        {
          name: 'authtoken',
          value: '',
          enabled: true,
          secret: true,
          type: 'text',
          uid: 'mockeduuidvalue123456'
        },
        {
          name: 'region',
          value: 'eu',
          enabled: true,
          secret: false,
          type: 'text',
          uid: 'mockeduuidvalue123456'
        }
      ]
    });
  });

  it.skip('should throw Error when JSON parsing fails', async () => {
    const invalidBrunoEnvironment = {
      id: 'some-id',
      name: 'My Environment',
      values: [
        {
          key: 'var1',
          value: 'value1',
          enabled: true,
          type: 'text'
        }
      ]
    };

    await expect(postmanToBrunoEnvironment(invalidBrunoEnvironment)).rejects.toThrow(Error);
    await expect(postmanToBrunoEnvironment(invalidBrunoEnvironment)).rejects.toThrow(
      'Unable to parse the postman environment json file'
    );
  });

  it('should handle empty variables', async () => {
    const collectionWithEmptyVars = {
      name: 'My Environment',
      values: []
    };

    const brunoCollection = await postmanToBrunoEnvironment(collectionWithEmptyVars);
    expect(brunoCollection.variables).toEqual([]);
  });

  it('should handle undefined variables', async () => {
    const collectionWithUndefinedVars = {
      name: 'My Environment'
    };

    const brunoCollection = await postmanToBrunoEnvironment(collectionWithUndefinedVars);
    expect(brunoCollection.variables).toEqual([]);
  });
});
