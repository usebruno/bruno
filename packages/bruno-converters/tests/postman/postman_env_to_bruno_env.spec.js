import { describe, it, expect } from '@jest/globals';
import path from 'path';
import { importEnvironmentFromFilepath } from '../../src/postman/postman_env_to_bruno_env';

describe('importEnvironment Function', () => {
  it('should correctly import a valid Postman environment file', async () => {
    const fileName = path.resolve(__dirname, '../data', 'files/valid_env.json');

    const brunoEnvironment = await importEnvironmentFromFilepath({ filepath: fileName });

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
    const fileName = path.resolve(__dirname, '../data', 'invalid_json_env.json');

    await expect(importEnvironmentFromFilepath({ filepath: fileName })).rejects.toThrow(Error);
    await expect(importEnvironmentFromFilepath({ filepath: fileName })).rejects.toThrow(
      'Unable to parse the postman environment json file'
    );
  });
});
