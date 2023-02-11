const jsonQuery = require('json-query');

const JS_KEYWORDS = `
  break case catch class const continue debugger default delete do
  else export extends false finally for function if import in instanceof
  new null return super switch this throw true try typeof var void while with
  undefined let static yield arguments of
`.split(/\s+/).filter(word => word.length > 0);

/**
 * Creates a function from a Javascript expression
 * 
 * When the function is called, the variables used in this expression are picked up from the context
 * 
 * ```js
 * res.data.pets.map(pet => pet.name.toUpperCase())
 * 
 * function(context) {
 *   const { res, pet } = context;
 *   return res.data.pets.map(pet => pet.name.toUpperCase())
 * }
 * ```
 */
const compileJsExpression = (expr) => {
  // get all dotted identifiers (foo, bar.baz, .baz)
  const matches = expr.match(/([\w\.$]+)/g) ?? [];

  // get valid js identifiers (foo, bar)
  const names = matches
    .filter(match => /^[a-zA-Z$_]/.test(match))
    .map(match => match.split('.')[0]);

  // exclude js keywords and get unique vars
  const vars = new Set(names.filter(name => !JS_KEYWORDS.includes(name)));
  const spread = [...vars].join(", ");
  const body = `const { ${spread} } = context; return ${expr}`;
  return new Function("context", body);
};

const internalExpressionCache = new Map();

const evaluateJsExpression = (expression, context) => {
  let fn = internalExpressionCache.get(expression);
  if (fn == null) {
    internalExpressionCache.set(expression, fn = compileJsExpression(expression));
  }
  return fn(context);
};

const createResponseParser = (response = {}) => {
  const res = (expr) => {
    const output = jsonQuery(expr, { data: response.data });
    return output ? output.value : null;
  };

  res.status = response.status;
  res.statusText = response.statusText;
  res.headers = response.headers;
  res.body = response.data;

  return res;
};

module.exports = {
  evaluateJsExpression,
  createResponseParser,
  internalExpressionCache
};