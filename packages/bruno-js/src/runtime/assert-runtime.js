const _ = require('lodash');
const chai = require('chai');
const { nanoid } = require('nanoid');
const Bru = require('../bru');
const BrunoRequest = require('../bruno-request');
const { evaluateJsTemplateLiteral, evaluateJsExpression, createResponseParser } = require('../utils');
const { interpolateString } = require('../interpolate-string');

const { expect } = chai;
chai.use(require('chai-string'));
chai.use(function (chai, utils) {
  // Custom assertion for checking if a variable is JSON
  chai.Assertion.addProperty('json', function () {
    const obj = this._obj;
    const isJson = typeof obj === 'object' && obj !== null && !Array.isArray(obj) && obj.constructor === Object;

    this.assert(isJson, `expected ${utils.inspect(obj)} to be JSON`, `expected ${utils.inspect(obj)} not to be JSON`);
  });
});

// Custom assertion for matching regex
chai.use(function (chai, utils) {
  chai.Assertion.addMethod('match', function (regex) {
    const obj = this._obj;
    let match = false;
    if (obj === undefined) {
      match = false;
    } else {
      match = regex.test(obj);
    }

    this.assert(
      match,
      `expected ${utils.inspect(obj)} to match ${regex}`,
      `expected ${utils.inspect(obj)} not to match ${regex}`
    );
  });
});

/**
 * Assertion operators
 *
 * eq          : equal to
 * neq         : not equal to
 * gt          : greater than
 * gte         : greater than or equal to
 * lt          : less than
 * lte         : less than or equal to
 * in          : in
 * notIn       : not in
 * contains    : contains
 * notContains : not contains
 * length      : length
 * matches     : matches
 * notMatches  : not matches
 * startsWith  : starts with
 * endsWith    : ends with
 * between     : between
 * isEmpty     : is empty
 * isNull      : is null
 * isUndefined : is undefined
 * isDefined   : is defined
 * isTruthy    : is truthy
 * isFalsy     : is falsy
 * isJson      : is json
 * isNumber    : is number
 * isString    : is string
 * isBoolean   : is boolean
 * isArray     : is array
 */
const parseAssertionOperator = (str = '') => {
  if (!str || typeof str !== 'string' || !str.length) {
    return {
      operator: 'eq',
      value: str
    };
  }

  const operators = [
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'in',
    'notIn',
    'contains',
    'notContains',
    'length',
    'matches',
    'notMatches',
    'startsWith',
    'endsWith',
    'between',
    'isEmpty',
    'isNull',
    'isUndefined',
    'isDefined',
    'isTruthy',
    'isFalsy',
    'isJson',
    'isNumber',
    'isString',
    'isBoolean',
    'isArray'
  ];

  const unaryOperators = [
    'isEmpty',
    'isNull',
    'isUndefined',
    'isDefined',
    'isTruthy',
    'isFalsy',
    'isJson',
    'isNumber',
    'isString',
    'isBoolean',
    'isArray'
  ];

  const [operator, ...rest] = str.trim().split(' ');
  const value = rest.join(' ');

  if (unaryOperators.includes(operator)) {
    return {
      operator,
      value: ''
    };
  }

  if (operators.includes(operator)) {
    return {
      operator,
      value
    };
  }

  return {
    operator: 'eq',
    value: str
  };
};

const isUnaryOperator = (operator) => {
  const unaryOperators = [
    'isEmpty',
    'isNull',
    'isUndefined',
    'isDefined',
    'isTruthy',
    'isFalsy',
    'isJson',
    'isNumber',
    'isString',
    'isBoolean',
    'isArray'
  ];

  return unaryOperators.includes(operator);
};

const evaluateRhsOperand = (rhsOperand, operator, context) => {
  if (isUnaryOperator(operator)) {
    return;
  }

  const interpolationContext = {
    requestVariables: context.bru.requestVariables,
    collectionVariables: context.bru.collectionVariables,
    envVariables: context.bru.envVariables,
    processEnvVars: context.bru.processEnvVars
  };

  // gracefully allow both a,b as well as [a, b]
  if (operator === 'in' || operator === 'notIn') {
    if (rhsOperand.startsWith('[') && rhsOperand.endsWith(']')) {
      rhsOperand = rhsOperand.substring(1, rhsOperand.length - 1);
    }

    return rhsOperand
      .split(',')
      .map((v) => evaluateJsTemplateLiteral(interpolateString(v.trim(), interpolationContext), context));
  }

  if (operator === 'between') {
    const [lhs, rhs] = rhsOperand
      .split(',')
      .map((v) => evaluateJsTemplateLiteral(interpolateString(v.trim(), interpolationContext), context));
    return [lhs, rhs];
  }

  // gracefully allow both ^[a-Z] as well as /^[a-Z]/
  if (operator === 'matches' || operator === 'notMatches') {
    if (rhsOperand.startsWith('/') && rhsOperand.endsWith('/')) {
      rhsOperand = rhsOperand.substring(1, rhsOperand.length - 1);
    }

    return interpolateString(rhsOperand, interpolationContext);
  }

  return evaluateJsTemplateLiteral(interpolateString(rhsOperand, interpolationContext), context);
};

class AssertRuntime {
  runAssertions(assertions, request, response, envVariables, collectionVariables, processEnvVars) {
    const requestVariables = request?.requestVariables || {};
    const enabledAssertions = _.filter(assertions, (a) => a.enabled);
    if (!enabledAssertions.length) {
      return [];
    }

    const bru = new Bru(envVariables, collectionVariables, processEnvVars, undefined, requestVariables);
    const req = new BrunoRequest(request);
    const res = createResponseParser(response);

    const bruContext = {
      bru,
      req,
      res
    };

    const context = {
      ...envVariables,
      ...requestVariables,
      ...collectionVariables,
      ...processEnvVars,
      ...bruContext
    };

    const assertionResults = [];

    // parse assertion operators
    for (const v of enabledAssertions) {
      const lhsExpr = v.name;
      const rhsExpr = v.value;
      const { operator, value: rhsOperand } = parseAssertionOperator(rhsExpr);

      try {
        const lhs = evaluateJsExpression(lhsExpr, context);
        const rhs = evaluateRhsOperand(rhsOperand, operator, context);

        switch (operator) {
          case 'eq':
            expect(lhs).to.equal(rhs);
            break;
          case 'neq':
            expect(lhs).to.not.equal(rhs);
            break;
          case 'gt':
            expect(lhs).to.be.greaterThan(rhs);
            break;
          case 'gte':
            expect(lhs).to.be.greaterThanOrEqual(rhs);
            break;
          case 'lt':
            expect(lhs).to.be.lessThan(rhs);
            break;
          case 'lte':
            expect(lhs).to.be.lessThanOrEqual(rhs);
            break;
          case 'in':
            expect(lhs).to.be.oneOf(rhs);
            break;
          case 'notIn':
            expect(lhs).to.not.be.oneOf(rhs);
            break;
          case 'contains':
            expect(lhs).to.include(rhs);
            break;
          case 'notContains':
            expect(lhs).to.not.include(rhs);
            break;
          case 'length':
            expect(lhs).to.have.lengthOf(rhs);
            break;
          case 'matches':
            expect(lhs).to.match(new RegExp(rhs));
            break;
          case 'notMatches':
            expect(lhs).to.not.match(new RegExp(rhs));
            break;
          case 'startsWith':
            expect(lhs).to.startWith(rhs);
            break;
          case 'endsWith':
            expect(lhs).to.endWith(rhs);
            break;
          case 'between':
            const [min, max] = rhs;
            expect(lhs).to.be.within(min, max);
            break;
          case 'isEmpty':
            expect(lhs).to.be.empty;
            break;
          case 'isNull':
            expect(lhs).to.be.null;
            break;
          case 'isUndefined':
            expect(lhs).to.be.undefined;
            break;
          case 'isDefined':
            expect(lhs).to.not.be.undefined;
            break;
          case 'isTruthy':
            expect(lhs).to.be.true;
            break;
          case 'isFalsy':
            expect(lhs).to.be.false;
            break;
          case 'isJson':
            expect(lhs).to.be.json;
            break;
          case 'isNumber':
            expect(lhs).to.be.a('number');
            break;
          case 'isString':
            expect(lhs).to.be.a('string');
            break;
          case 'isBoolean':
            expect(lhs).to.be.a('boolean');
            break;
          case 'isArray':
            expect(lhs).to.be.a('array');
            break;
          default:
            expect(lhs).to.equal(rhs);
            break;
        }

        assertionResults.push({
          uid: nanoid(),
          lhsExpr,
          rhsExpr,
          rhsOperand,
          operator,
          status: 'pass'
        });
      } catch (err) {
        assertionResults.push({
          uid: nanoid(),
          lhsExpr,
          rhsExpr,
          rhsOperand,
          operator,
          status: 'fail',
          error: err.message
        });
      }
    }

    return assertionResults;
  }
}

module.exports = AssertRuntime;
