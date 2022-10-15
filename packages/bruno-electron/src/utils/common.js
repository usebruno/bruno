const { customAlphabet } = require('nanoid');

// a customized version of nanoid without using _ and -
const uuid = () => {
  // https://github.com/ai/nanoid/blob/main/url-alphabet/index.js
  const urlAlphabet = 'useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict';
  const customNanoId = customAlphabet (urlAlphabet, 21);

  return customNanoId();
};

const stringifyJson = async (str) => {
  try {
    return JSON.stringify(str, null, 2);
  } catch(err) {
    return Promise.reject(err);
  }
}

const parseJson = async (obj) => {
  try {
    return JSON.parse(obj);
  } catch(err) {
    return Promise.reject(err);
  }
}

module.exports = {
  uuid,
  stringifyJson,
  parseJson
};
