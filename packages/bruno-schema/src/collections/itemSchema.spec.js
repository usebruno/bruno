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
});
