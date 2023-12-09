const Handlebars = require('handlebars');
const interpolateEnvVars = require('./interpolate-env-vars');

const interpolateString = (str, envVars, collectionVariables, processEnvVars) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }

  processEnvVars = processEnvVars || {};
  collectionVariables = collectionVariables || {};
  envVars = interpolateEnvVars(processEnvVars, envVars);

  const template = Handlebars.compile(str, { noEscape: true });

  // collectionVariables take precedence over envVars
  const combinedVars = {
    ...envVars,
    ...collectionVariables,
    process: {
      env: {
        ...processEnvVars
      }
    }
  };

  return template(combinedVars);
};

module.exports = interpolateString;
