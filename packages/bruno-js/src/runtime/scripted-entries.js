// Passes the caller's bru into runRequestByItemPathname so the host can attribute
// each call to it (for scope and entry recording).
const bindRunRequest = (bru, runRequestByItemPathname) => {
  if (!runRequestByItemPathname) return;
  bru.runRequest = (relativePathname) =>
    runRequestByItemPathname(relativePathname, bru);
};

// Kept off bru so user scripts don't see it on autocomplete.
const createScopeSetter = (bru) => (scope) => {
  bru._currentScope = scope || null;
};

module.exports = {
  bindRunRequest,
  createScopeSetter
};
