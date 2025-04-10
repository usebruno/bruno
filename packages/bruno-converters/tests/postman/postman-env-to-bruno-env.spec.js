import { describe, it, expect } from '@jest/globals';
import postmanToBrunoEnvironment from '../../src/postman/postman-env-to-bruno-env';

describe('postmanToBrunoEnvironment Function', () => {
  it('should correctly import a valid Postman environment file', async () => {
    const postmanEnvironment = {
      "id": "some-id",
      "name": "My Environment",
      "values": [
        {
          "key": "var1",
          "value": "value1",
          "enabled": true,
          "type": "text"
        },
        {
          "key": "var2",
          "value": "value2",
          "enabled": false,
          "type": "secret"
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
        },
        {
          name: 'var2',
          value: 'value2',
          enabled: false,
          secret: true,
        },
      ],
    };

    expect(brunoEnvironment).toEqual(expectedEnvironment);
  });

  it.skip('should throw Error when JSON parsing fails', async () => {
    const invalidBrunoEnvironment = {
      "id": "some-id",
      "name": "My Environment",
      "values": [
        {
          "key": "var1",
          "value": "value1",
          "enabled": true,
          "type": "text"
        }
      ]
    }

    await expect(postmanToBrunoEnvironment(invalidBrunoEnvironment)).rejects.toThrow(Error);
    await expect(postmanToBrunoEnvironment(invalidBrunoEnvironment)).rejects.toThrow(
      'Unable to parse the postman environment json file'
    );
  });
});
