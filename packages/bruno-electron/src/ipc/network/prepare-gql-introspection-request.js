const Mustache = require('mustache');
const { getIntrospectionQuery } = require('graphql');

// override the default escape function to prevent escaping
Mustache.escape = function (value) {
  return value;
};

const prepareGqlIntrospectionRequest = (endpoint, envVars) => {
  if (endpoint && endpoint.length) {
    endpoint = Mustache.render(endpoint, envVars);
  }
  const introspectionQuery = getIntrospectionQuery();
  const queryParams = {
    query: introspectionQuery
  };

  const request = {
    method: 'POST',
    url: endpoint,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    data: JSON.stringify(queryParams)
  };

  return request;
};

module.exports = prepareGqlIntrospectionRequest;
