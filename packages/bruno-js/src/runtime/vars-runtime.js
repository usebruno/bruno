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

    // Parse cookies from request headers and attach to bru context
    if (request?.headers) {
      const cookieHeader = Object.entries(request.headers).find(([key]) => key.toLowerCase() === 'cookie');
      if (cookieHeader && cookieHeader[1]) {
        const cookieString = cookieHeader[1];
        const cookiesObj = {};
        
        // Parse cookie string to object
        cookieString.split(';').forEach(cookie => {
          const [name, ...valueParts] = cookie.trim().split('=');
          if (name) {
            cookiesObj[name] = valueParts.join('=');
          }
        });
        
        // Attach to bru object
        bru._cookiesObj = cookiesObj;
      }
    }

    // Also check for Set-Cookie in response headers and add those cookies
    if (response?.headers) {
      const setCookieHeaders = [];
      
      // Check for Set-Cookie in headers
      if (response.headers['set-cookie']) {
        if (Array.isArray(response.headers['set-cookie'])) {
          setCookieHeaders.push(...response.headers['set-cookie']);
        } else {
          setCookieHeaders.push(response.headers['set-cookie']);
        }
      }
      
      // If there are Set-Cookie headers, parse and add to cookies object
      if (setCookieHeaders.length > 0) {
        const cookiesObj = bru._cookiesObj || {};
        
        setCookieHeaders.forEach(setCookieHeader => {
          if (typeof setCookieHeader === 'string' && setCookieHeader.length) {
            const [cookiePair] = setCookieHeader.split(';');
            if (cookiePair) {
              const [name, ...valueParts] = cookiePair.trim().split('=');
              if (name) {
                cookiesObj[name] = valueParts.join('=');
              }
            }
          }
        });
        
        // Update the cookies object
        bru._cookiesObj = cookiesObj;
      }
    }

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
