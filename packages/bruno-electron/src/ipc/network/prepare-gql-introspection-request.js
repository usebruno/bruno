const Handlebars = require('handlebars');
const { getIntrospectionQuery } = require('graphql');
const { setAuthHeaders } = require('./prepare-request');
const JSONbig = require('json-bigint');
const JSONbigAsStr = JSONbig({ useNativeBigInt: true });

const prepareGqlIntrospectionRequest = (endpoint, envVars, request, collectionRoot) => {
  if (endpoint && endpoint.length) {
    endpoint = Handlebars.compile(endpoint, { noEscape: true })(envVars);
  }

  const queryParams = {
    query: getIntrospectionQuery()
  };

  let axiosRequest = {
    method: 'POST',
    url: endpoint,
    headers: {
      ...mapHeaders(request.headers),
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    data: JSONbigAsStr.stringify(queryParams)
  };

  return setAuthHeaders(axiosRequest, request, collectionRoot);
};

const mapHeaders = (headers) => {
  const entries = headers.filter((header) => header.enabled).map(({ name, value }) => [name, value]);

  return Object.fromEntries(entries);
};

module.exports = prepareGqlIntrospectionRequest;
