// Forwards the caller's bru as a second arg so the host can attribute the call.
const bindRunRequest = (bru, runRequestByItemPathname) => {
  if (!runRequestByItemPathname) return;
  bru.runRequest = (relativePathname) =>
    runRequestByItemPathname(relativePathname, bru);
};

// Kept off bru to stay out of user-facing autocomplete.
const createScopeSetter = (bru) => (scope) => {
  bru._currentScope = scope || null;
};

module.exports = {
  bindRunRequest,
  createScopeSetter
};
