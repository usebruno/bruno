const { uuid } = require('../../utils/common');

// Mutates `collection.root.request.vars.req` (and draft.root.request.vars.req if
// present) to reflect a script's collection-variable changes, so the next request
// in a folder/collection run's iteration picks them up through mergeVars().
// Without this, bru.setCollectionVar() inside request N would be invisible to
// request N+1 in the same iteration (envVars/globalEnvironmentVariables already
// propagate because they're mutated in place by reference).
//
// TODO: this is a write-back patch, not the structural fix. The root cause
// is that mergeVars (utils/collection.js) rebuilds `collectionVariables` fresh
// from `collection.root.request.vars.req` on every iteration, while envVars is
// built once at runner scope and passed by reference. May need a re-wire.
const applyCollectionVarsToCollectionRoot = (collection, collectionVariables) => {
  if (!collectionVariables || typeof collectionVariables !== 'object') return;

  const writeBack = (root) => {
    if (!root) return;
    if (!root.request) root.request = {};
    if (!root.request.vars) root.request.vars = {};
    const existing = Array.isArray(root.request.vars.req) ? root.request.vars.req : [];

    const disabled = existing.filter((v) => !v.enabled);
    const enabledByName = new Map(existing.filter((v) => v.enabled).map((v) => [v.name, v]));
    const scriptNames = Object.keys(collectionVariables);

    // Rebuild the enabled slice from the script's output. Keys present here are
    // kept (with updated value); previously-enabled keys missing from the script
    // output are treated as `bru.deleteCollectionVar` and dropped. Disabled vars
    // (user-disabled in the UI) are preserved untouched.
    const updatedEnabled = scriptNames.map((name) => {
      const existingVar = enabledByName.get(name);
      if (existingVar) {
        return { ...existingVar, value: collectionVariables[name] };
      }
      return { uid: uuid(), name, value: collectionVariables[name], type: 'text', enabled: true };
    });

    root.request.vars.req = [...updatedEnabled, ...disabled];
  };

  writeBack(collection.root);
  if (collection.draft?.root) writeBack(collection.draft.root);
};

module.exports = { applyCollectionVarsToCollectionRoot };
