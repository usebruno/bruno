const _ = require('lodash');
const Bru = require('../bru');
const BrunoRequest = require('../bruno-request');
const { evaluateJsExpression, createResponseParser } = require('../utils');

const { executeQuickJsVm } = require('../sandbox/quickjs');

const evaluateJsExpressionBasedOnRuntime = (expr, context, runtime, mode) => {
  if (runtime === 'quickjs') {
    return executeQuickJsVm({
      script: expr,
      context,
      scriptType: 'expression'
    });
  }

  return evaluateJsExpression(expr, context);
};

class VarsRuntime {
  constructor(props) {
    this.runtime = props?.runtime || 'vm2';
    this.mode = props?.mode || 'developer';
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
        const value = evaluateJsExpressionBasedOnRuntime(v.value, context, this.runtime);
        if (v.name) {
          bru.setVar(v.name, value);
        }
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
