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

  it('request schema must throw an error if method is invalid (contains space)', async () => {
    const request = {
      url: 'https://restcountries.com/v2/alpha/in',
      method: 'GET JUNK',
      headers: [],
      params: [],
      body: {
        mode: 'none'
      }
    };

    await expect(requestSchema.validate(request)).rejects.toThrow();
  });
});
