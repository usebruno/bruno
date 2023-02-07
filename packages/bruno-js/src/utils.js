const jsonQuery = require('json-query');

const evaluateJsExpression = (expression, context) => {
  const fn = new Function(...Object.keys(context), `return ${expression}`);
  return fn(...Object.values(context));
};

const createResponseParser = (res = {}) => (expr)  => {
  const output = jsonQuery(expr, { data: res.data });

  return output ? output.value : null;
};

module.exports = {
  evaluateJsExpression,
  createResponseParser
};