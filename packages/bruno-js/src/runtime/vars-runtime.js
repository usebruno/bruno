const _ = require('lodash');
const Bru = require('../bru');
const BrunoRequest = require('../bruno-request');
const { evaluateJsTemplateLiteral, evaluateJsExpression, createResponseParser } = require('../utils');

const { isolatedVMStrictInstance } = require('../sandbox/isolatedvm');

const toNumber = (value) => {
  const num = Number(value);
  return Number.isInteger(num) ? parseInt(value, 10) : parseFloat(value);
};

const evaluateJsTemplateLiteralBasedOnRuntime = (v, context, runtime, mode) => {
  let value;
  if (mode === 'restricted') {
    let _value = _.get(context, v, v);
    if (_value && typeof _value == 'object') {
      value = JSON.stringify(_value);
    } else if (Number.isNaN(Number(_value))) {
      value = _value;
    } else {
      value = toNumber(_value);
    }
  } else if (mode === 'safe') {
    value = isolatedVMStrictInstance.execute({
      script: v,
      context,
      scriptType: 'template-literal'
    });
  } else {
    value = evaluateJsTemplateLiteral(v, context);
  }
  return value;
};

const evaluateJsExpressionBasedOnRuntime = (v, context, runtime, mode) => {
  let value;
  if (mode === 'restricted') {
    let _value = _.get(context, v, v);
    if (_value && typeof _value == 'object') {
      value = JSON.stringify(_value);
    } else if (Number.isNaN(Number(_value))) {
      value = _value;
    } else {
      value = toNumber(_value);
    }
  } else if (mode === 'safe') {
    value = isolatedVMStrictInstance.execute({
      script: v,
      context,
      scriptType: 'expression'
    });
  } else {
    value = evaluateJsExpression(v, context);
  }
  return value;
};

class VarsRuntime {
  constructor(props) {
    this.runtime = props?.runtime || 'vm2';
    this.mode = props?.mode || 'developer';
  }

  runPreRequestVars(vars, request, envVariables, runtimeVariables, collectionPath, processEnvVars) {
    if (!request?.requestVariables) {
      request.requestVariables = {};
    }
    const enabledVars = _.filter(vars, (v) => v.enabled);
    if (!enabledVars.length) {
      return;
    }

    const bru = new Bru(envVariables, runtimeVariables, processEnvVars);
    const req = new BrunoRequest(request);

    const bruContext = {
      bru,
      req
    };

    const context = {
      ...envVariables,
      ...runtimeVariables,
      ...bruContext
    };

    _.each(enabledVars, (v) => {
      const value = evaluateJsTemplateLiteralBasedOnRuntime(v.value, context, this.runtime, this.mode);
      request?.requestVariables && (request.requestVariables[v.name] = value);
    });
  }

  runPostResponseVars(vars, request, response, envVariables, runtimeVariables, collectionPath, processEnvVars) {
    const requestVariables = request?.requestVariables || {};
    const enabledVars = _.filter(vars, (v) => v.enabled);
    if (!enabledVars.length) {
      return;
    }

    const bru = new Bru(envVariables, runtimeVariables, processEnvVars, undefined, requestVariables);
    const req = new BrunoRequest(request);
    const res = createResponseParser(response);

    const bruContext = {
      bru,
      req,
      res
    };

    const context = {
      ...envVariables,
      ...runtimeVariables,
      ...bruContext
    };

    const errors = new Map();
    _.each(enabledVars, (v) => {
      try {
        const value = evaluateJsExpressionBasedOnRuntime(v.value, context, this.runtime, this.mode);
        bru.setVar(v.name, value);
      } catch (error) {
        errors.set(v.name, error);
      }
    });

    let error = null;
    if (errors.size > 0) {
      // Format all errors as a single string to be displayed in a toast
      const errorMessage = [...errors.entries()].map(([name, err]) => `${name}: ${err.message ?? err}`).join('\n');
      error = `${errors.size} error${errors.size === 1 ? '' : 's'} in post response variables: \n${errorMessage}`;
    }

    return {
      envVariables,
      runtimeVariables,
      error
    };
  }
}

module.exports = VarsRuntime;
