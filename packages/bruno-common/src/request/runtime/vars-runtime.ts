import _ from 'lodash';
import { Bru } from './dataObject/Bru';
import { BrunoRequest } from './dataObject/BrunoRequest';
import { evaluateJsTemplateLiteral, evaluateJsExpression, createResponseParser } from './utils';
import { RequestItem, RequestVariable, Response } from '../types';

export class VarsRuntime {
  runPreRequestVars(
    vars: RequestVariable[],
    request: RequestItem,
    envVariables: Record<string, unknown>,
    collectionVariables: Record<string, unknown>,
    collectionPath: string,
    processEnvVars: Record<string, unknown>
  ) {
    const enabledVars = _.filter(vars, (v) => v.enabled);
    if (!enabledVars.length) {
      return;
    }

    const bru = new Bru(envVariables, collectionVariables, processEnvVars, collectionPath, 'the-env');
    const req = new BrunoRequest(request, true);

    const combinedVariables = {
      ...envVariables,
      ...collectionVariables,
      bru,
      req
    };

    _.each(enabledVars, (v) => {
      const value = evaluateJsTemplateLiteral(v.value, combinedVariables);
      bru.setVar(v.name, value);
    });

    return {
      collectionVariables
    };
  }

  runPostResponseVars(
    vars: RequestVariable[],
    request: RequestItem,
    response: Response,
    responseBody: any,
    envVariables: Record<string, unknown>,
    collectionVariables: Record<string, unknown>,
    collectionPath: string,
    processEnvVars: Record<string, unknown>
  ) {
    const enabledVars = _.filter(vars, (v) => v.enabled);
    if (!enabledVars.length) {
      return;
    }

    const bru = new Bru(envVariables, collectionVariables, processEnvVars, collectionPath, 'the-env');
    const req = new BrunoRequest(request, true);
    const res = createResponseParser(response, responseBody);

    const context = {
      ...envVariables,
      ...collectionVariables,
      ...processEnvVars,
      bru,
      req,
      res
    };

    _.each(enabledVars, (v) => {
      const value = evaluateJsExpression(v.value, context);
      bru.setVar(v.name, value);
    });

    return {
      collectionVariables
    };
  }
}
