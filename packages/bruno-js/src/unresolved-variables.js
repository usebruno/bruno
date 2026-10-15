// preparedRequest reference -> Set<variable name>
// WeakMap holds the key weakly, so the set is garbage-collected with its request. A prepared request is new
// on every send, so parallel sends of one item never share a set.
const unresolvedVariablesByRequest = new WeakMap();

const trackUnresolvedVariables = (request, parentUnresolvedVariables) => {
  const unresolvedVariables = parentUnresolvedVariables ?? new Set();
  unresolvedVariablesByRequest.set(request, unresolvedVariables);
  return unresolvedVariables;
};

const getUnresolvedVariableCollector = (request) => {
  const unresolvedVariables = unresolvedVariablesByRequest.get(request);
  return unresolvedVariables && ((name) => unresolvedVariables.add(name));
};

module.exports = {
  trackUnresolvedVariables,
  getUnresolvedVariableCollector
};
