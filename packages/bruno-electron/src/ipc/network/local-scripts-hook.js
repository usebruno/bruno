const { get } = require('lodash');
const {
  collectLocalScriptRefs,
  resolveLocalScriptVariables,
  loadGlobalLocalScriptsConfig,
  normalizeLocalScripts,
  mergeLocalScriptOutputs
} = require('@usebruno/requests');
const { preferencesUtil } = require('../../store/preferences');

const disabledMessage = 'This request references local scripts ({{$script:name}}), but local script execution is disabled. '
  + 'Enable "Allow Local Scripts" in Preferences, or run the CLI with --allow-local-scripts.';

const collectionConsentMessage = (names) => 'This request references local scripts defined by the collection\'s bruno.json ('
  + `${names.join(', ')}). Running collection-defined commands is a separate opt-in: enable `
  + '"Also allow commands defined inside collections" in Preferences, or pass '
  + '--allow-local-script-collections on the CLI.';

/**
 * Shared hook for the single-request path and the collection/folder runner:
 * collect `{{$script:name}}` references across the environment variables and
 * the request, enforce the opt-in gates, run the referenced commands, and
 * merge their outputs into envVars (both env-nested substitutions and the
 * `$script:name` interpolation variables).
 *
 * Commands from the collection's brunoConfig.localScripts block are a separate
 * trust domain from the user's global registry and require their own opt-in.
 *
 * The returned rollback removes the request-scoped script outputs again;
 * runners sharing one envVars object across sequential requests must call it
 * when the request finishes. It is a no-op when nothing was referenced.
 */
const resolveRequestLocalScripts = async ({
  envVars,
  request,
  brunoConfig,
  collectionPath,
  processEnvVars,
  signal
}) => {
  const refs = [...new Set([
    ...collectLocalScriptRefs(envVars),
    ...collectLocalScriptRefs(request)
  ])];
  if (refs.length === 0) {
    return () => {};
  }
  if (!preferencesUtil.isLocalScriptsEnabled()) {
    throw new Error(disabledMessage);
  }

  const globalConfig = loadGlobalLocalScriptsConfig();
  const collectionConfig = get(brunoConfig, 'localScripts', null);
  const scriptsConfigs = [globalConfig];

  if (preferencesUtil.isLocalScriptsCollectionCommandsEnabled()) {
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

  const { envVars: resolvedEnvVars, scriptVariables } = await resolveLocalScriptVariables({
    envVars,
    referencedNames: refs,
    scriptsConfigs,
    context: {
      cwd: collectionPath,
      env: processEnvVars,
      signal
    }
  });
  return mergeLocalScriptOutputs(envVars, resolvedEnvVars, scriptVariables);
};

module.exports = { resolveRequestLocalScripts };
