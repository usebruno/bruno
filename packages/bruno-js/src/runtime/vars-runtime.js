const _ = require('lodash');
const Bru = require('../bru');
const BrunoRequest = require('../bruno-request');
const { evaluateJsTemplateLiteral, evaluateJsExpression, createResponseParser } = require('../utils');

class VarsRuntime {
  runPreRequestVars(vars, request, envVariables, collectionVariables, collectionPath, processEnvVars) {
    if (!vars.length) {
      return;
    }

    const disabledVars = _.filter(vars, (v) => !v.enabled);
    const enabledVars = _.filter(vars, (v) => v.enabled);

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
      const value = evaluateJsTemplateLiteral(v.value, context);
      bru.setVar(v.name, value);
    });

    _.each(disabledVars, (v) => {
      bru.deleteVar(v.name);
    });

    return {
      collectionVariables
    };
  }

  runPostResponseVars(vars, request, response, envVariables, collectionVariables, collectionPath, processEnvVars) {
    if (!vars.length) {
      return;
    }

    const disabledVars = _.filter(vars, (v) => !v.enabled);
    const enabledVars = _.filter(vars, (v) => v.enabled);

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

    _.each(enabledVars, (v) => {
      const value = evaluateJsExpression(v.value, context);
      bru.setVar(v.name, value);
    });

    _.each(disabledVars, (v) => {
      bru.deleteVar(v.name);
    });

    return {
      envVariables,
      collectionVariables
    };
  }
}

module.exports = VarsRuntime;
