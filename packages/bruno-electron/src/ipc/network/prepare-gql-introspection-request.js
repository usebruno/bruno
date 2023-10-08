const Handlebars = require('handlebars');
const { getIntrospectionQuery } = require('graphql');
const { get } = require('lodash');

const prepareGqlIntrospectionRequest = (endpoint, envVars, request) => {
  if (endpoint && endpoint.length) {
    endpoint = Handlebars.compile(endpoint, { noEscape: true })(envVars);
  }

  const introspectionQuery = getIntrospectionQuery();
  const queryParams = {
    query: introspectionQuery
  };

  let axiosRequest = {
    method: 'POST',
    url: endpoint,
    headers: {
      ...mapHeaders(request.headers),
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    data: JSON.stringify(queryParams)
  };

  if (request.auth) {
    if (request.auth.mode === 'basic') {
      axiosRequest.auth = {
        username: get(request, 'auth.basic.username'),
        password: get(request, 'auth.basic.password')
      };
    }

    if (request.auth.mode === 'bearer') {
      axiosRequest.headers.authorization = `Bearer ${get(request, 'auth.bearer.token')}`;
    }
  }

  return axiosRequest;
};

const mapHeaders = (headers) => {
  const entries = headers.filter((header) => header.enabled).map(({ name, value }) => [name, value]);

  return Object.fromEntries(entries);
};

module.exports = prepareGqlIntrospectionRequest;
