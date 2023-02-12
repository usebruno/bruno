const jsonQuery = require('json-query');
const { get } = require("./get");

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
  const vars = new Set(
    matches
      .filter(match => /^[a-zA-Z$_]/.test(match))   // starts with valid js identifier (foo.bar)
      .map(match => match.split('.')[0])            // top level identifier (foo)
      .filter(name => !JS_KEYWORDS.includes(name))  // exclude js keywords
  );

  // globals such as Math
  const globals = [...vars].filter(name => name in globalThis);

  const code = {
    vars: [...vars].join(", "),
    // pick global from context or globalThis
    globals: globals
      .map(name => ` ${name} = ${name} ?? globalThis.${name};`)
      .join('')
  };

  const body = `let { ${code.vars} } = context; ${code.globals}; return ${expr}`;

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

  /**
   * Get supports deep object navigation and filtering
   * 1. Easy array navigation
   *    ```js
   *    res.get('customer.orders.items.amount')
   *    ```
   * 2. Deep navigation .. double dots
   *    ```js
   *    res.get('..items.amount')
   *    ```
   * 3. Array indexing
   *    ```js
   *    res.get('..items[0].amount')
   *    ```
   * 4. Array filtering [?] with corresponding js filter
   *    ```js
   *    res.get('..items[?].amount', i => i.amount > 20) 
   *    ```
   */
  res.get = (path, ...filters) => get(response.data, path, ...filters);

  return res;
};

module.exports = {
  evaluateJsExpression,
  createResponseParser,
  internalExpressionCache
};