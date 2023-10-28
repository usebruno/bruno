const _ = require('lodash');
const Bru = require('../bru');
const BrunoRequest = require('../bruno-request');
const { evaluateJsTemplateLiteral, evaluateJsExpression, createResponseParser } = require('../utils');
const { getVault } = require('bruno/src/vault/vault');
const { vaultVariableRegex } = require('@usebruno/app/src/utils/vault');

class VarsRuntime {
  async runPreRequestVars(vars, request, envVariables, collectionVariables, collectionPath, processEnvVars) {
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
      const value = evaluateJsTemplateLiteral(v.value, context);
      bru.setVar(v.name, value);
    });

    await this.handleVaultVariables(enabledVars, bru, context);

    return {
      collectionVariables
    };
  }

  async runPostResponseVars(
    vars,
    request,
    response,
    envVariables,
    collectionVariables,
    collectionPath,
    processEnvVars
  ) {
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

    _.each(enabledVars, (v) => {
      const value = evaluateJsTemplateLiteral(v.value, context);
      bru.setVar(v.name, value);
    });

    await this.handleVaultVariables(enabledVars, bru, context);

    return {
      envVariables,
      collectionVariables
    };
  }

  async handleVaultVariables(variables, bru, context) {
    const vault = getVault(context);
    for (let v of variables) {
      if (vault && v.value.match(vaultVariableRegex)) {
        const value = await vault.replaceVariables(v.value);
        bru.setVar(v.name, value);
      }
    }
  }
}

module.exports = VarsRuntime;
