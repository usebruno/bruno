const { StringDecoder } = require('node:string_decoder');

const createSseDecoder = () => {
  const decoder = new StringDecoder('utf8');
  return {
    decode: (dataBuffer) => ({ data: decoder.write(dataBuffer), dataBuffer }),
    end: () => decoder.end()
  };
};

module.exports = { createSseDecoder };
