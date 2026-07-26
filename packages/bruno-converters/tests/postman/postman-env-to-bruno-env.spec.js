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

  it('should default enabled to true when the field is missing and preserve an explicit false', async () => {
    const postmanEnvironment = {
      id: 'some-id',
      name: 'My Environment',
      values: [
        { key: 'api_url', value: 'https://api.example.com', enabled: true },
        { key: 'gymfinder-backend-url', value: 'https://example.com', type: 'default' },
        { key: 'disabled_var', value: 'off', enabled: false }
      ]
    };

    const brunoEnvironment = await postmanToBrunoEnvironment(postmanEnvironment);

    const expectedEnvironment = {
      name: 'My Environment',
      variables: [
        {
          name: 'api_url',
          value: 'https://api.example.com',
          enabled: true,
          secret: false,
          type: 'text',
          uid: 'mockeduuidvalue123456'
        },
        {
          name: 'gymfinder-backend-url',
          value: 'https://example.com',
          enabled: true,
          secret: false,
          type: 'text',
          uid: 'mockeduuidvalue123456'
        },
        {
          name: 'disabled_var',
          value: 'off',
          enabled: false,
          secret: false,
          type: 'text',
          uid: 'mockeduuidvalue123456'
        }
      ]
    };

    expect(brunoEnvironment).toEqual(expectedEnvironment);
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
