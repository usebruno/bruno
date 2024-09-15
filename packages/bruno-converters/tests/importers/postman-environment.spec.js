// postman-environment.spec.js

import { describe, it, expect } from '@jest/globals';
import { BrunoError } from '../../src/common/error';
import path from 'path';
import { importPostmanEnvironment } from '../../src';

describe('importEnvironment Function', () => {
  it('should correctly import a valid Postman environment file', async () => {
    const fileName = path.resolve(__dirname, '../data', 'valid_env.json');

    const brunoEnvironment = await importPostmanEnvironment(fileName);

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

  it.skip('should throw BrunoError when JSON parsing fails', async () => {
    const fileName = path.resolve(__dirname, '../data', 'invalid_json_env.json');

    await expect(importEnvironment(fileName)).rejects.toThrow(BrunoError);
    await expect(importEnvironment(fileName)).rejects.toThrow(
      'Unable to parse the postman environment json file'
    );
  });
});
