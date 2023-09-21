const { customAlphabet } = require('nanoid');
const { expect } = require('@jest/globals');

// a customized version of nanoid without using _ and -
const uuid = () => {
  // https://github.com/ai/nanoid/blob/main/url-alphabet/index.js
  const urlAlphabet = 'useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict';
  const customNanoId = customAlphabet(urlAlphabet, 21);

  return customNanoId();
};

const validationErrorWithMessages = (...errors) => {
  return expect.objectContaining({
    errors
  });
};

module.exports = {
  uuid,
  validationErrorWithMessages
};
