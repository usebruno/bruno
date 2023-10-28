const Handlebars = require('handlebars');
const { forOwn, cloneDeep } = require('lodash');

const interpolateEnvVars = (str, processEnvVars) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }

  const template = Handlebars.compile(str, { noEscape: true });

  return template({
    process: {
      env: {
        ...processEnvVars
      }
    }
  });
};

const interpolateString = (str, { envVariables, collectionVariables, processEnvVars }) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }

  processEnvVars = processEnvVars || {};
  collectionVariables = collectionVariables || {};

  // we clone envVariables because we don't want to modify the original object
  envVariables = envVariables ? cloneDeep(envVariables) : {};

  // envVariables can inturn have values as {{process.env.VAR_NAME}}
  // so we need to interpolate envVariables first with processEnvVars
  forOwn(envVariables, (value, key) => {
    envVariables[key] = interpolateEnvVars(value, processEnvVars);
  });

  const template = Handlebars.compile(str, { noEscape: true });

  // collectionVariables take precedence over envVariables
  const combinedVars = {
    ...envVariables,
    ...collectionVariables,
    process: {
      env: {
        ...processEnvVars
      }
    }
  };

  return template(combinedVars);
};

module.exports = {
  interpolateString
};
