const _ = require('lodash');
const Bru = require('../bru');
const BrunoRequest = require('../bruno-request');
const { evaluateJsTemplateLiteral, evaluateJsExpression, createResponseParser } = require('../utils');

const { executeInIsolatedVM } = require('../sandbox/isolatedvm');

const evaluateJsTemplateLiteralBasedOnRuntime = (v, context, runtime) => {
  let value;
  if (runtime === 'isolated-vm') {
    value = executeInIsolatedVM({
      script: v,
      context,
      scriptType: 'template-literal'
    });
  } else if (runtime === 'node-vm') {
    value = v;
  } else {
    value = evaluateJsTemplateLiteral(v, context);
  }
  return value;
};

const evaluateJsExpressionBasedOnRuntime = (v, context, runtime) => {
  let value;
  if (runtime === 'isolated-vm') {
    value = executeInIsolatedVM({
      script: v,
      context,
      scriptType: 'expression'
    });
  } else if (runtime === 'node-vm') {
    value = v;
  } else {
    value = evaluateJsExpression(v, context);
  }
  return value;
};

class VarsRuntime {
  constructor(props) {
    this.runtime = props?.runtime || 'vm2';
  }

  runPreRequestVars(vars, request, envVariables, collectionVariables, collectionPath, processEnvVars) {
    const enabledVars = _.filter(vars, (v) => v.enabled);
    if (!enabledVars.length) {
      return;
    }

    const bru = new Bru(envVariables, collectionVariables, processEnvVars);
    const req = new BrunoRequest(request);

    const bruContext = {
      bru,
      req
    };

    const context = {
      ...envVariables,
      ...collectionVariables,
      ...bruContext
    };

    _.each(enabledVars, (v) => {
      const value = evaluateJsTemplateLiteralBasedOnRuntime(v.value, context, this.runtime);
      bru.setVar(v.name, value);
    });

    return {
      collectionVariables
    };
  }

  runPostResponseVars(vars, request, response, envVariables, collectionVariables, collectionPath, processEnvVars) {
    const enabledVars = _.filter(vars, (v) => v.enabled);
    if (!enabledVars.length) {
      return;
    }

    const bru = new Bru(envVariables, collectionVariables, processEnvVars);
    const req = new BrunoRequest(request);
    const res = createResponseParser(response);

    const bruContext = {
      bru,
      req,
      res
    };

    const context = {
      ...envVariables,
      ...collectionVariables,
      ...bruContext
    };

    const errors = new Map();
    _.each(enabledVars, (v) => {
      try {
        const value = evaluateJsExpressionBasedOnRuntime(v.value, context, this.runtime);
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
      collectionVariables,
      error
    };
  }
}

module.exports = VarsRuntime;
