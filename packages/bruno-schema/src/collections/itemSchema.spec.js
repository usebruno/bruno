const { expect } = require('@jest/globals');
const { uuid, validationErrorWithMessages } = require('../utils/testUtils');
const { itemSchema } = require('./index');

describe('Item Schema Validation', () => {
  it('item schema must validate successfully - simple items', async () => {
    const item = {
      uid: uuid(),
      name: 'A Folder',
      type: 'folder',
      tags: ['smoke-test']
    };

    const isValid = await itemSchema.validate(item);
    expect(isValid).toBeTruthy();
  });

  it('item schema accepts arbitrary non-empty tag strings (opencollection allows any chars)', async () => {
    const validItem = {
      uid: uuid(),
      name: 'A Folder',
      type: 'folder',
      tags: ['tag_1', 'Äiti-123 test', 'Pets & Dogs', 'R&D', '&', 'tag🔥name']
    };

    const isValid = await itemSchema.validate(validItem);
    expect(isValid).toBeTruthy();

    const invalidItem = {
      uid: uuid(),
      name: 'A Folder',
      type: 'folder',
      tags: ['']
    };

    await expect(itemSchema.validate(invalidItem)).rejects.toThrow('tag must not be empty');
  });

  it('item schema must throw an error if name is missing', async () => {
    const item = {
      uid: uuid(),
      type: 'folder'
    };

    return Promise.all([
      expect(itemSchema.validate(item)).rejects.toEqual(validationErrorWithMessages('name is required'))
    ]);
  });

  it('item schema must throw an error if name is empty', async () => {
    const item = {
      uid: uuid(),
      name: '',
      type: 'folder'
    };

    return Promise.all([
      expect(itemSchema.validate(item)).rejects.toEqual(
        validationErrorWithMessages('name must be at least 1 character')
      )
    ]);
  });

  it('item schema must throw an error if request is not present when item-type is http-request', async () => {
    const item = {
      uid: uuid(),
      name: 'Get Users',
      type: 'http-request'
    };

    return Promise.all([
      expect(itemSchema.validate(item)).rejects.toEqual(
        validationErrorWithMessages('request is required when item-type is request')
      )
    ]);
  });

  it('item schema must throw an error if request is not present when item-type is graphql-request', async () => {
    const item = {
      uid: uuid(),
      name: 'Get Users',
      type: 'graphql-request'
    };

    return Promise.all([
      expect(itemSchema.validate(item)).rejects.toEqual(
        validationErrorWithMessages('request is required when item-type is request')
      )
    ]);
  });

  describe('settings.maxRedirects', () => {
    const itemWithMaxRedirects = (maxRedirects) => ({
      uid: uuid(),
      name: 'Get Users',
      type: 'http-request',
      request: {
        url: 'https://restcountries.com/v2/alpha/in',
        method: 'GET',
        headers: [],
        params: [],
        body: { mode: 'none' }
      },
      settings: { maxRedirects }
    });

    it.each([0, 50, 51, 1000, Number.MAX_SAFE_INTEGER, 1e21, 9.999999999998865e21])(
      'item schema must accept a maxRedirects of %p',
      async (maxRedirects) => {
        const validated = await itemSchema.validate(itemWithMaxRedirects(maxRedirects));
        expect(validated.settings.maxRedirects).toBe(maxRedirects);
      }
    );

    it('item schema must accept a null maxRedirects', async () => {
      const validated = await itemSchema.validate(itemWithMaxRedirects(null));
      expect(validated.settings.maxRedirects).toBeNull();
    });

    it('item schema must accept an undefined maxRedirects', async () => {
      const validated = await itemSchema.validate(itemWithMaxRedirects(undefined));
      expect(validated.settings.maxRedirects).toBeUndefined();
    });

    it('item schema must throw an error if maxRedirects is negative', async () => {
      await expect(itemSchema.validate(itemWithMaxRedirects(-1))).rejects.toMatchObject({
        path: 'settings.maxRedirects',
        type: 'min'
      });
    });

    it.each([3.5, Infinity])('item schema must throw an error if maxRedirects is %p', async (maxRedirects) => {
      await expect(itemSchema.validate(itemWithMaxRedirects(maxRedirects))).rejects.toMatchObject({
        path: 'settings.maxRedirects',
        type: 'integer'
      });
    });

    it.each(['100', 'abc'])('item schema must throw an error if maxRedirects is the string %p', async (maxRedirects) => {
      await expect(itemSchema.validate(itemWithMaxRedirects(maxRedirects))).rejects.toMatchObject({
        path: 'settings.maxRedirects',
        type: 'typeError'
      });
    });
  });
});
