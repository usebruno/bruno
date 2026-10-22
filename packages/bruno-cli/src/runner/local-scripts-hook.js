const { get } = require('lodash');
const {
  collectLocalScriptRefs,
  collectRequestLocalScriptRefs,
  resolveLocalScriptVariables,
  loadGlobalLocalScriptsConfig,
  normalizeLocalScripts,
  mergeLocalScriptOutputs
} = require('@usebruno/requests');

const disabledMessage = 'This request references local scripts ({{$script:name}}), but local script execution is disabled. '
  + 'Re-run with --allow-local-scripts.';

const collectionConsentMessage = (names) => 'This request references local scripts defined by the collection\'s bruno.json ('
  + `${names.join(', ')}). Running collection-defined commands is a separate opt-in: re-run with `
  + '--allow-local-script-collections (in addition to --allow-local-scripts).';

// Twin of the Electron `ipc/network/local-scripts-hook.js`: keep both in sync.
const noopScope = {
  restore: () => {},
  sanitize: (vars) => vars
};

/**
 * CLI twin of the Electron `ipc/network/local-scripts-hook.js`: collect
 * `{{$script:name}}` references across the environment variables and the
 * interpolated request fields, enforce the opt-in flags, run the referenced
 * commands, and merge their outputs into envVariables. Returns a scope whose
 * `restore` removes the request-scoped outputs when the request finishes
 * (envVariables is shared across sequential requests) and whose `sanitize`
 * scrubs them from envVariables snapshots before they are persisted to disk;
 * it is a no-op when nothing was referenced.
 *
 * Commands from the collection's brunoConfig.localScripts block are a separate
 * trust domain from the user's global registry and require
 * --allow-local-script-collections in addition to --allow-local-scripts.
 */
const resolveRequestLocalScripts = async ({
  envVariables,
  request,
  brunoConfig,
  collectionPath,
  processEnvVars,
  signal,
  options
}) => {
  const refs = [...new Set([
    ...collectLocalScriptRefs(envVariables),
    ...collectRequestLocalScriptRefs(request)
  ])];
  if (refs.length === 0) {
    return noopScope;
  }
  if (get(options, 'allowLocalScripts', false) !== true) {
    throw new Error(disabledMessage);
  }

  const localScriptsPath = get(options, 'localScriptsPath');
  const globalConfig = loadGlobalLocalScriptsConfig(localScriptsPath ? { filePath: localScriptsPath } : {});
  const collectionConfig = get(brunoConfig, 'localScripts', null);
  const scriptsConfigs = [globalConfig];

  if (get(options, 'allowLocalScriptCollections', false) === true) {
    scriptsConfigs.push(collectionConfig);
  } else {
    // Surface a precise error for refs that would resolve only through the
    // untrusted collection block, instead of a generic "not registered".
    const globalNames = new Set(normalizeLocalScripts(globalConfig).map((script) => script.name));
    const collectionNames = new Set(normalizeLocalScripts(collectionConfig).map((script) => script.name));
    const collectionOnlyRefs = refs.filter((name) => !globalNames.has(name) && collectionNames.has(name));
    if (collectionOnlyRefs.length > 0) {
      throw new Error(collectionConsentMessage(collectionOnlyRefs));
    }
  }

  const { envVars: resolvedEnvVariables, scriptVariables } = await resolveLocalScriptVariables({
    envVars: envVariables,
    referencedNames: refs,
    scriptsConfigs,
    context: {
      cwd: collectionPath,
      env: processEnvVars,
      signal
    }
  });
  return mergeLocalScriptOutputs(envVariables, resolvedEnvVariables, scriptVariables);
};

module.exports = { resolveRequestLocalScripts };
