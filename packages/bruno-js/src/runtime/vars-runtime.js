const _ = require('lodash');
const Bru = require('../bru');
const BrunoRequest = require('../bruno-request');
const { evaluateJsTemplateLiteral, evaluateJsExpression, createResponseParser } = require('../utils');

const getVariablesKeyValuePairs = (variables) => {
  if (!variables) return variables;
  return variables?.reduce((acc, v) => {
    return {
      ...acc,
      [v?.name]: v?.value
    };
  }, {});
};

class VarsRuntime {
  runPreRequestVars(vars, request, envVariables, runtimeVariables, collectionPath, processEnvVars) {
    if (!request?.resolvedRequestVariables) {
      request.resolvedRequestVariables = {};
    }

    let { collectionVariables = {}, folderVariables = [], requestVariables = {} } = request;

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
      request?.resolvedRequestVariables && (request.resolvedRequestVariables[v.name] = value);
    });

    // collection variables
    collectionVariables = collectionVariables?.map((cv) => {
      let _context = {
        ...envVariables,
        ...runtimeVariables,
        ...bruContext
      };
      const _value = evaluateJsTemplateLiteral(cv?.value, _context);
      cv['value'] = _value;
      return cv;
    });

    // folder variables
    folderVariables = folderVariables?.map((fvs) => {
      // folder variables - pre-request
      return fvs?.map((fv) => {
        let _context = {
          ...envVariables,
          ...getVariablesKeyValuePairs(collectionVariables),
          ...runtimeVariables,
          ...bruContext
        };
        const _value = evaluateJsTemplateLiteral(fv?.value, _context);
        fv['value'] = _value;
        return fv;
      });
    });

    // request variables
    requestVariables = requestVariables?.map((cv) => {
      let _context = {
        ...envVariables,
        ...getVariablesKeyValuePairs(collectionVariables),
        ...runtimeVariables,
        ...bruContext
      };
      const _value = evaluateJsTemplateLiteral(cv?.value, _context);
      cv['value'] = _value;
      return cv;
    });

    request.collectionVariables = collectionVariables;
    request.folderVariables = folderVariables;
    request.requestVariables = requestVariables;
  }

  runPostResponseVars(vars, request, response, envVariables, runtimeVariables, collectionPath, processEnvVars) {
    const enabledVars = _.filter(vars, (v) => v.enabled);
    if (!enabledVars.length) {
      return;
    }

    const bru = new Bru(envVariables, runtimeVariables, processEnvVars, undefined);
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
