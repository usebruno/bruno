const { expect } = require('@jest/globals');
const { uuid, validationErrorWithMessages } = require('../utils/testUtils');
const { requestSchema } = require('./index');

describe('Request Schema Validation', () => {
  it('request schema must validate successfully - simple request', async () => {
    const request = {
      url: 'https://restcountries.com/v2/alpha/in',
      method: 'GET',
      headers: [],
      params: [],
      body: {
        mode: 'none'
      }
    };

    const isValid = await requestSchema.validate(request);
    expect(isValid).toBeTruthy();
  });

  it('request schema must validate successfully - vars with dataType', async () => {
    const request = {
      url: 'https://restcountries.com/v2/alpha/in',
      method: 'GET',
      headers: [],
      params: [],
      body: {
        mode: 'none'
      },
      vars: {
        req: [
          { uid: uuid(), name: 'var_num', value: '300', dataType: 'number', enabled: true, local: false },
          { uid: uuid(), name: 'var_bool', value: 'true', dataType: 'boolean', enabled: true, local: false },
          { uid: uuid(), name: 'var_obj', value: '{"scope":"req"}', dataType: 'object', enabled: true, local: false },
          { uid: uuid(), name: 'var_str', value: 'plain', enabled: true, local: false }
        ],
        res: []
      }
    };

    const validated = await requestSchema.validate(request);
    expect(validated.vars.req[0].dataType).toBe('number');
    expect(validated.vars.req[1].dataType).toBe('boolean');
    expect(validated.vars.req[2].dataType).toBe('object');
    expect(validated.vars.req[3].dataType).toBeUndefined();
  });

  it('request schema must validate successfully - custom method', async () => {
    const request = {
      url: 'https://restcountries.com/v2/alpha/in',
      method: 'FOO',
      headers: [],
      params: [],
      body: {
        mode: 'none'
      }
    };

    const isValid = await requestSchema.validate(request);
    expect(isValid).toBeTruthy();
  });

  it('request schema must validate successfully - custom method with dash', async () => {
    const request = {
      url: 'https://restcountries.com/v2/alpha/in',
      method: 'X-CUSTOM',
      headers: [],
      params: [],
      body: {
        mode: 'none'
      }
    };

    const isValid = await requestSchema.validate(request);
    expect(isValid).toBeTruthy();
  });

  it('request schema must throw an error if method is empty', async () => {
    const request = {
      url: 'https://restcountries.com/v2/alpha/in',
      method: '',
      headers: [],
      params: [],
      body: {
        mode: 'none'
      }
    };

    await expect(requestSchema.validate(request)).rejects.toThrow();
  });

  it('request schema must validate successfully - method with space is allowed now', async () => {
    const request = {
      url: 'https://restcountries.com/v2/alpha/in',
      method: 'GET JUNK',
      headers: [],
      params: [],
      body: {
        mode: 'none'
      }
    };

    const isValid = await requestSchema.validate(request);
    expect(isValid).toBeTruthy();
  });
});
