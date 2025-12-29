const { interpolate } = require('@usebruno/common');
const { prepareGqlIntrospectionRequest } = require('@usebruno/requests');

const prepareGqlIntrospectionRequestLocal = (endpoint, resolvedVars, request, collectionRoot) => {
  return prepareGqlIntrospectionRequest({
    endpoint,
    resolvedVars,
    request,
    collectionRoot,
    interpolate
  });
};

module.exports = prepareGqlIntrospectionRequestLocal;
