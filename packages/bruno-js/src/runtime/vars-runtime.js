const _ = require('lodash');
const Bru = require('../bru');
const BrunoRequest = require('../bruno-request');
const { evaluateJsTemplateLiteral, evaluateJsExpression, createResponseParser } = require('../utils');

class VarsRuntime {
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
      const value = evaluateJsTemplateLiteral(v.value, context);
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
        const value = evaluateJsExpression(v.value, context);
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
