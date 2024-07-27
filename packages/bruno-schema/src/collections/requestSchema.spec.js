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
      tags: ['smoke-test'],
      body: {
        mode: 'none'
      }
    };

    const isValid = await requestSchema.validate(request);
    expect(isValid).toBeTruthy();
  });

  it('request schema must throw an error of method is invalid', async () => {
    const request = {
      url: 'https://restcountries.com/v2/alpha/in',
      method: 'GET-junk',
      headers: [],
      params: [],
      body: {
        mode: 'none'
      }
    };

    return Promise.all([
      expect(requestSchema.validate(request)).rejects.toEqual(
        validationErrorWithMessages(
          'method must be one of the following values: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS, TRACE'
        )
      )
    ]);
  });
});
