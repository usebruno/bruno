import { get } from '@usebruno/query';
import { stringify, parse } from 'lossless-json';
import jsonQuery from 'json-query';

const JS_KEYWORDS = `
  break case catch class const continue debugger default delete do
  else export extends false finally for function if import in instanceof
  new null return super switch this throw true try typeof var void while with
  undefined let static yield arguments of
`
  .split(/\s+/)
  .filter((word) => word.length > 0);

/**
 * Creates a function from a JavaScript expression
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
export const compileJsExpression = (expr: string) => {
  // get all dotted identifiers (foo, bar.baz, .baz)
  const matches = expr.match(/([\w\.$]+)/g) ?? [];

  // get valid js identifiers (foo, bar)
  const vars = new Set(
    matches
      .filter((match) => /^[a-zA-Z$_]/.test(match)) // starts with valid js identifier (foo.bar)
      .map((match) => match.split('.')[0]) // top level identifier (foo)
      .filter((name) => !JS_KEYWORDS.includes(name)) // exclude js keywords
  );

  // globals such as Math
  const globals = [...vars].filter((name) => name in globalThis);

  const code = {
    vars: [...vars].join(', '),
    // pick global from context or globalThis
    globals: globals.map((name) => ` ${name} = ${name} ?? globalThis.${name};`).join('')
  };

  const body = `let { ${code.vars} } = context; ${code.globals}; return ${expr}`;

  return new Function('context', body);
};

const internalExpressionCache = new Map();

export const evaluateJsExpression = (expression: string, context: any) => {
  let fn = internalExpressionCache.get(expression);
  if (fn == null) {
    internalExpressionCache.set(expression, (fn = compileJsExpression(expression)));
  }
  return fn(context);
};

export const evaluateJsTemplateLiteral = (templateLiteral: string, context: any) => {
  if (!templateLiteral || !templateLiteral.length || typeof templateLiteral !== 'string') {
    return templateLiteral;
  }

  templateLiteral = templateLiteral.trim();

  if (templateLiteral === 'true') {
    return true;
  }

  if (templateLiteral === 'false') {
    return false;
  }

  if (templateLiteral === 'null') {
    return null;
  }

  if (templateLiteral === 'undefined') {
    return undefined;
  }

  if (templateLiteral.startsWith('"') && templateLiteral.endsWith('"')) {
    return templateLiteral.slice(1, -1);
  }

  if (templateLiteral.startsWith("'") && templateLiteral.endsWith("'")) {
    return templateLiteral.slice(1, -1);
  }

  if (!isNaN(Number(templateLiteral))) {
    const number = Number(templateLiteral);
    // Check if the number is too high. Too high number might get altered, see #1000
    if (number > Number.MAX_SAFE_INTEGER) {
      return templateLiteral;
    }
    return number;
  }

  templateLiteral = '`' + templateLiteral + '`';

  return evaluateJsExpression(templateLiteral, context);
};

export const createResponseParser = (response: any = {}) => {
  const res = (expr: string, ...fns: any[]) => {
    return get(response.data, expr, ...fns);
  };

  res.status = response.status;
  res.statusText = response.statusText;
  res.headers = response.headers;
  res.body = response.data;
  res.responseTime = response.responseTime;

  res.jq = (expr: string) => {
    const output = jsonQuery(expr, { data: response.data });
    return output ? output.value : null;
  };

  return res;
};

/**
 * Objects that are created inside vm execution context result in an serialization error when sent to the renderer process
 * Error sending from webFrameMain:  Error: Failed to serialize arguments
 *    at s.send (node:electron/js2c/browser_init:169:631)
 *    at g.send (node:electron/js2c/browser_init:165:2156)
 * How to reproduce
 *    Remove the cleanJson fix and execute the below post response script
 *    bru.setVar("a", {b:3});
 * Todo: Find a better fix
 */
export const cleanJson = (data: any) => {
  try {
    return parse(stringify(data)!);
  } catch (e) {
    return data;
  }
};
