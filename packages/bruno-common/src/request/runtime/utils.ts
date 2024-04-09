import { get } from '@usebruno/query';
import { stringify, parse, LosslessNumber } from 'lossless-json';
import jsonQuery from 'json-query';
import { Response } from '../types';
import fs from 'node:fs';

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

type ResponseParser = ((expr: string, ...fns: any) => any) & {
  body: any;
  status: number;
  headers: Record<string, string | string[] | undefined>;
  responseTime: number;
  jq: (expr: string) => unknown;
};

export const createResponseParser = (response: Response) => {
  let bodyData: any = fs.readFileSync(response.path, { encoding: response.encoding });
  try {
    bodyData = parse(bodyData);
  } catch {}

  const res: ResponseParser = (expr: string, ...fns: any[]) => {
    return get(bodyData, expr, ...fns);
  };

  res.body = bodyData;
  res.status = response.statusCode;
  res.headers = response.headers;
  res.responseTime = response.responseTime;

  res.jq = (expr: string) => {
    const output = jsonQuery(expr, { data: res.body });
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
 */
export const cleanJson = (data: any) => {
  try {
    return parse(stringify(data)!, null, (value) => {
      // By default, this will return the LosslessNumber object, but because it's passed into ipc we
      // need to convert it into a number because LosslessNumber is converted into a weird object
      return new LosslessNumber(value).valueOf();
    });
  } catch (e) {
    return data;
  }
};
