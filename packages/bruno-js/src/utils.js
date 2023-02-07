const jsonQuery = require('json-query');

const evaluateJsExpression = (expression, context) => {
  const fn = new Function(...Object.keys(context), `return ${expression}`);
  return fn(...Object.values(context));
};

const createResponseParser = (response = {}) => {
  const res = (expr)  => {
    const output = jsonQuery(expr, { data: response.data });
    return output ? output.value : null;
  }

  res.status = response.status;
  res.statusText = response.statusText;
  res.headers = response.headers;
  res.body = response.data;

  return res;
};

module.exports = {
  evaluateJsExpression,
  createResponseParser
};