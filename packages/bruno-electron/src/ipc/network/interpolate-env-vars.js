const Handlebars = require('handlebars');
const { forOwn, cloneDeep } = require('lodash');

const interpolateEnvVars = (processEnvVars = {}, envVars = {}) => {
  // we clone envVars because we don't want to modify the original object
  envVars = envVars ? cloneDeep(envVars) : {};

  // envVars can inturn have values as {{process.env.VAR_NAME}}
  // so we need to interpolate envVars first with processEnvVars
  forOwn(envVars, (value, key) => {
    envVars[key] = interpolateEnvVar(value, processEnvVars, envVars);
  });

  return envVars;
};

const interpolateEnvVar = (str, processEnvVars, envVars, deep = 0) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }
  if (deep > 10) {
    return str;
  }

  const template = Handlebars.compile(str, { noEscape: true });
  const combinedVars = {
    ...envVars,
    process: {
      env: {
        ...processEnvVars
      }
    }
  };

  const result = template(combinedVars);
  if (result === str) {
    return result;
  } else {
    return interpolateEnvVar(result, processEnvVars, envVars, deep + 1);
  }
};

module.exports = interpolateEnvVars;
