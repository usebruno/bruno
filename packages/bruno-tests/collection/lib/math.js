const { PI } = require('./lib/constants');

const sum = (a, b) => a + b;
const areaOfCircle = (radius) => PI * radius * radius;

module.exports = {
  sum,
  areaOfCircle
};