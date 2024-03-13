const dotenv = require('dotenv');

const parser = (input) => {
  const buf = Buffer.from(input);
  const parsed = dotenv.parse(buf);
  return parsed;
};

module.exports = parser;
