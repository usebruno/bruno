const fs = require('fs');
const { isEqual } = require('lodash');
const { stringifyEnvironment, stringifyCollection, parseEnvironment } = require('@usebruno/filestore');
const { getDataTypeFromValue } = require('@usebruno/common').utils;
const { parseEnvironmentJson } = require('./environment');

/**
 * Bruno stashes the env name inside the vars map under `__name__`; it is metadata, never a real variable.
 */
const INTERNAL_KEYS = new Set(['__name__']);

/**
 * Sets or removes the `dataType` field on a variable based on the JS type of `value`.
 * `string` is the implicit default on disk — omit the field rather than writing `dataType: string`.
 *
 * @param {{ name: string, value: any, dataType?: string }} variable - Variable entry to mutate in place.
 * @param {any} value - JS value whose type drives the inference.
 * @returns {object} The same `variable` reference, after mutation.
 *
 * @example
 * applyInferredDataType({ name: 'port', value: 3000 }, 3000);
 *  → { name: 'port', value: 3000, dataType: 'number' }
 *
 * applyInferredDataType({ name: 'host', value: 'x', dataType: 'number' }, 'x');
 *  → { name: 'host', value: 'x' }   // dataType deleted
 */
const applyInferredDataType = (variable, value) => {
  const inferred = getDataTypeFromValue(value);
  if (inferred === 'string') {
    delete variable.dataType;
  } else {
    variable.dataType = inferred;
  }
  return variable;
};

/**
 * Marks a variable secret and empties its value, so a script-written secret cannot reach disk.
 * The `.bru` and `.yml` writers emit secrets as name-only rows, but the JSON path serializes the
 * entry as-is — a retained value would land there in cleartext. Emptied rather than deleted: `''`
 * is the value a secret parses back as, so the entry keeps the shape every reader expects.
 * Only the disk copy is emptied; the runtime map still carries the value for later requests.
 *
 * @param {{ name: string, value?: any, secret?: boolean }} variable - Variable entry to mutate in place.
 * @returns {object} The same `variable` reference, after mutation.
 *
 * @example
 * markSecretWithEmptyValue({ name: 'token', value: 'rotated', secret: false });
 *  → { name: 'token', value: '', secret: true }
 */
const markSecretWithEmptyValue = (variable) => {
  variable.secret = true;
  variable.value = '';
  return variable;
};

/**
 * Returns a shallow copy of `vars` with internal keys (`__name__`) removed.
 *
 * @param {Object<string, any>} vars - Flat name→value map; may be null/undefined.
 * @returns {Object<string, any>} New object without internal keys.
 *
 * @example
 * stripInternal({ token: 'abc', __name__: 'dev' });
 *  → { token: 'abc' }
 */
const stripInternal = (vars) => {
  const out = {};
  for (const [k, v] of Object.entries(vars || {})) {
    if (!INTERNAL_KEYS.has(k)) out[k] = v;
  }
  return out;
};

/**
 * In-place replace of `target`'s contents with `source`'s, while preserving `target.__name__`.
 * Callers hold long-lived references to `target`, so a fresh object would not propagate.
 * Keys missing from `source` are deleted — this is how `bru.deleteEnvVar` flows through.
 *
 * @param {Object<string, any>} target - Object mutated in place.
 * @param {Object<string, any>} source - Desired end state (minus internal keys).
 * @returns {void}
 *
 * @example
 * const target = { a: 1, b: 2, __name__: 'dev' };
 * overwriteMap(target, { a: 9, c: 3 });
 * -> target is now { a: 9, c: 3, __name__: 'dev' }
 * -> b deleted, c added, __name__ preserved
 */
const overwriteMap = (target, source) => {
  const preservedName = target.__name__;
  for (const key of Object.keys(target)) {
    if (INTERNAL_KEYS.has(key)) continue;
    if (!(key in source)) delete target[key];
  }
  for (const [key, value] of Object.entries(source)) {
    if (INTERNAL_KEYS.has(key)) continue;
    target[key] = value;
  }
  if (preservedName !== undefined && target.__name__ === undefined) {
    target.__name__ = preservedName;
  }
};

/**
 * Sync a runtime result into the in-memory maps the next request will read. No disk I/O.
 * Env / runtime / global maps are mutated by reference; collection vars are replaced on the request.
 *
 * @param {{
 *   envVariables?: Object,
 *   runtimeVariables?: Object,
 *   collectionVariables?: Object,
 *   globalEnvironmentVariables?: Object
 * } | null} result - Runtime return value; any field may be null to indicate "unchanged".
 * @param {{
 *   envVariables: Object,
 *   runtimeVariables: Object,
 *   globalEnvVars: Object,
 *   request: Object
 * }} ctx - The long-lived maps and the current request object to update.
 * @returns {void}
 *
 * @example
 * After a script calls `bru.setEnvVar('token', 'abc')`:
 * const result = {
 *   envVariables: { token: 'abc' },
 *   runtimeVariables: null,
 *   collectionVariables: null,
 *   globalEnvironmentVariables: null
 * };
 * applyVariableUpdates(result, { envVariables, runtimeVariables, globalEnvVars, request });
 * -> envVariables now contains `token: 'abc'`, and the next request sees it.
 */
const applyVariableUpdates = (result, { envVariables, runtimeVariables, globalEnvVars, request }) => {
  if (!result) return;
  if (result.envVariables && envVariables) {
    overwriteMap(envVariables, result.envVariables);
  }
  if (result.runtimeVariables && runtimeVariables) {
    overwriteMap(runtimeVariables, result.runtimeVariables);
  }
  if (result.globalEnvironmentVariables && globalEnvVars) {
    overwriteMap(globalEnvVars, result.globalEnvironmentVariables);
  }
  // Collection vars live on the per-request object, not a shared map — replace the field outright.
  if (result.collectionVariables && request) {
    request.collectionVariables = stripInternal(result.collectionVariables);
  }
};

/**
 * Reconcile the env file's array of variable entries against the script's flat name→value map.
 * - Disabled entries are always preserved (user intent — toggled off, not deleted).
 * - Enabled entries absent from script output are dropped (so `bru.deleteEnvVar` reaches disk).
 * - New script keys are appended as enabled text vars with inferred dataType, except a name a
 *   disabled secret entry already declares — a secret's value has no on-disk representation here.
 * - `overrides`: names supplied via CLI (`--env-var`, or `--global-env-var` when merging the
 *   global env file) keyed to their injected value. The leaked override value never reaches
 *   disk and the file's entry is preserved, but a deliberate script write of a *different*
 *   value for the same name still persists.
 *
 * @param {Array<{ name: string, value: any, enabled?: boolean, type?: string, secret?: boolean, dataType?: string }>} variables
 *   Existing entries from the env file.
 * @param {Object<string, any>} scriptVarsRaw - Flat map from the script runtime; may include `__name__`.
 * @param {{ overrides?: Map<string, string>, skipKeys?: string[], variablesFromOtherEnvironmentFiles?: Array<object> }} [options] -
 *   Names → injected override values, names that must never be written to this file (e.g. ones a
 *   parent env declares), and the entries of every other environment file feeding the same runtime
 *   map, which an appended override takes its `secret` flag from.
 * @returns {Array<object>} New array of merged variable entries.
 *
 * @example
 * const variables = [
 *   { name: 'host',  value: 'old',  enabled: true,  type: 'text', secret: false },
 *   { name: 'stale', value: 'gone', enabled: true,  type: 'text', secret: false },
 *   { name: 'off',   value: 'kept', enabled: false, type: 'text', secret: false }
 * ];
 * const scriptVarsRaw = { host: 'new', port: 3000, __name__: 'dev' };
 * mergeScriptVarsIntoEnvList(variables, scriptVarsRaw);
 * → [
 *     { name: 'host', value: 'new',  enabled: true,  type: 'text', secret: false },                          // updated
 *     { name: 'off',  value: 'kept', enabled: false, type: 'text', secret: false },                          // preserved (disabled)
 *     { name: 'port', value: 3000,   enabled: true,  type: 'text', secret: false, dataType: 'number' }       // appended
 *   ]
 * -> `stale` was dropped (enabled but absent from script output).
 *
 * @example
 * With CLI override `--env-var token=transient`:
 * mergeScriptVarsIntoEnvList(
 *   [{ name: 'token', value: 'real', enabled: true, type: 'text', secret: true }],
 *   { token: 'transient', other: 'x' },
 *   { overrides: new Map([['token', 'transient']]) }
 * );
 * → [
 *     { name: 'token', value: 'real', enabled: true, type: 'text', secret: true },         // preserved unchanged
 *     { name: 'other', value: 'x',    enabled: true, type: 'text', secret: false }         // appended
 *   ]
 *
 * @example
 * Script *deliberately* sets the overridden key to a new value:
 * mergeScriptVarsIntoEnvList(
 *   [{ name: 'token', value: 'real', enabled: true, type: 'text', secret: true }],
 *   { token: 'rotated' },
 *   { overrides: new Map([['token', 'transient']]) }
 * );
 * → [{ name: 'token', value: 'rotated', enabled: true, type: 'text', secret: true }]      // persisted
 */
const mergeScriptVarsIntoEnvList = (variables, scriptVarsRaw, options = {}) => {
  const overrides = options.overrides instanceof Map ? options.overrides : new Map();
  const scriptVars = stripInternal(scriptVarsRaw);
  const scriptVarsKeys = new Set(Object.keys(scriptVars));
  // These names belong to another environment source (an `extends` parent, or an `--env-file`
  // loaded alongside this one); writing them here would shadow that source with a copy.
  for (const name of options.skipKeys || []) {
    delete scriptVars[name];
  }
  // Drop a script value only when it still matches the injected override — a different
  // value means the script deliberately wrote it (e.g. `bru.setEnvVar('token', 'rotated')`)
  // and must reach disk.
  for (const [key, overrideValue] of overrides) {
    if (key in scriptVars && scriptVars[key] === overrideValue) {
      delete scriptVars[key];
    }
  }
  const scriptKeys = new Set(Object.keys(scriptVars));
  // A rotated secret from another environment file lands here as an override; as a plain row its
  // value would reach disk in cleartext, so that file's secret flag has to come with it.
  const secretNamesFromOtherEnvironmentFiles = new Set(
    (options.variablesFromOtherEnvironmentFiles || []).filter((v) => v.secret).map((v) => v.name)
  );

  const next = (variables || [])
    .filter((v) => {
      if (v.enabled === false) return true;
      if (scriptVarsKeys.has(v.name)) return true;
      // Keep the file's entry for an overridden name even if the script didn't echo it back.
      if (overrides.has(v.name)) return true;
      return false;
    })
    .map((v) => {
      if (v.enabled === false || !scriptKeys.has(v.name)) return v;
      // A plain row of the same name shadows the other file's secret rather than replacing it, so
      // the rotated value would otherwise land on that plain row and reach disk in cleartext. The
      // row becoming a secret is the cost of keeping the value off disk.
      if (v.secret || secretNamesFromOtherEnvironmentFiles.has(v.name)) {
        // The written value is dropped, so a dataType inferred from it would type a value no reader
        // can see — and retype the secret the app holds in its own store. The row keeps the type its
        // file declares.
        return markSecretWithEmptyValue({ ...v });
      }
      return applyInferredDataType({ ...v, value: scriptVars[v.name] }, scriptVars[v.name]);
    });

  // Skip names that already appear as enabled entries; a same-named disabled entry still gets a fresh enabled row appended.
  const presentEnabled = new Set(next.filter((v) => v.enabled !== false).map((v) => v.name));
  // A disabled secret row is preserved untouched above, so an appended row is what would carry the
  // script's value — in cleartext, since nothing marks it secret. The row is skipped rather than
  // appended as a secret: the CLI cannot persist a secret's value at all, so it would add only a
  // second row of the same name, and secret names must be unique for the app to save the file again.
  const disabledSecretNames = new Set(next.filter((v) => v.enabled === false && v.secret).map((v) => v.name));
  for (const key of scriptKeys) {
    if (presentEnabled.has(key) || disabledSecretNames.has(key)) continue;
    const entry = { name: key, value: scriptVars[key], type: 'text', enabled: true, secret: false };
    // An appended secret row is name-only, so there is no value left for a dataType to describe.
    next.push(
      secretNamesFromOtherEnvironmentFiles.has(key)
        ? markSecretWithEmptyValue(entry)
        : applyInferredDataType(entry, scriptVars[key])
    );
  }
  return next;
};

/**
 * Same shape as {@link mergeScriptVarsIntoEnvList}, with collection-var conventions:
 * `type: 'request'`, no `secret` field, no `__name__` to strip.
 *
 * @param {Array<{ name: string, value: any, enabled?: boolean, type?: string, dataType?: string }>} variables
 *   Existing entries from the collection root.
 * @param {Object<string, any>} scriptVars - Flat map from the script runtime.
 * @returns {Array<object>} New array of merged collection-var entries.
 *
 * @example
 * mergeScriptVarsIntoCollectionVarsList(
 *   [{ name: 'region', value: 'us', enabled: true, type: 'request' }],
 *   { region: 'eu', retries: 3 }
 * );
 * → [
 *     { name: 'region',  value: 'eu', enabled: true, type: 'request' },
 *     { name: 'retries', value: 3,    enabled: true, type: 'request', dataType: 'number' }
 *   ]
 */
const mergeScriptVarsIntoCollectionVarsList = (variables, scriptVars) => {
  const scriptKeys = new Set(Object.keys(scriptVars || {}));
  const next = (variables || [])
    .filter((v) => (v.enabled === false ? true : scriptKeys.has(v.name)))
    .map((v) => {
      if (v.enabled === false || !scriptKeys.has(v.name)) return v;
      return applyInferredDataType({ ...v, value: scriptVars[v.name] }, scriptVars[v.name]);
    });

  const presentEnabled = new Set(next.filter((v) => v.enabled !== false).map((v) => v.name));
  for (const key of scriptKeys) {
    if (presentEnabled.has(key)) continue;
    const entry = { name: key, value: scriptVars[key], type: 'request', enabled: true };
    next.push(applyInferredDataType(entry, scriptVars[key]));
  }
  return next;
};

/**
 * Idempotency guard: skip the write when serialized output is byte-identical.
 *
 * @param {string} filePath - Absolute path to write.
 * @param {string} content - Serialized new content.
 * @param {string} existing - Current on-disk content.
 * @returns {boolean} `true` if the file was written, `false` if unchanged.
 *
 * @example
 * writeIfChanged('Prod.bru', 'vars { x: 1 }', 'vars { x: 1 }'); // → false (no write)
 * writeIfChanged('Prod.bru', 'vars { x: 2 }', 'vars { x: 1 }'); // → true  (file updated)
 */
const writeIfChanged = (filePath, content, existing) => {
  if (content === existing) return false;
  fs.writeFileSync(filePath, content);
  return true;
};

/**
 * @param {Array<{ name: string, value: any }>} [variablesFromOtherEnvironmentFiles] - Entries an
 *   environment source other than the file being written declares — its `extends` chain, or an
 *   `--env-file` loaded alongside it.
 * @param {Object<string, any>} scriptVars - Flat map from the script runtime.
 * @returns {string[]} Names the script left at the other source's value, to keep off disk.
 *
 * @example
 * keysLeftUnchanged(
 *   [{ name: 'host', value: 'parent' }, { name: 'token', value: 'secret' }],
 *   { host: 'parent', token: 'rotated' }
 * );
 *  → ['host']   // `token` was rewritten by the script, so it persists here as an override
 */
const keysLeftUnchanged = (variablesFromOtherEnvironmentFiles, scriptVars) => {
  const otherFileVariables = variablesFromOtherEnvironmentFiles || [];
  if (!otherFileVariables.length) return [];
  return Object.entries(scriptVars || {})
    .filter(([name, value]) => otherFileVariables.some((v) => v.name === name && isEqual(v.value, value)))
    .map(([name]) => name);
};

/**
 * Read → merge → write one env file. Used for both per-env and global-env files
 * (same shape, different descriptor).
 *
 * @param {{ path: string, format: 'json' | 'yml' | 'bru', inheritedEnvironmentVariables?: Array<object>, envFileVariables?: Array<object> } | null | undefined} envFile -
 *   Env file descriptor; no-op when missing. `inheritedEnvironmentVariables` are the entries this
 *   file resolves from its `extends` chain, `envFileVariables` the entries of an `--env-file`
 *   loaded alongside it — both are names another file owns and this one must not absorb.
 * @param {Object<string, any>} scriptVars - Flat map of vars the script declared.
 * @param {{ overrides?: Map<string, string> }} [options] - Injected override values keyed by name (`--env-var`, or `--global-env-var` for the global env file); forwarded to `mergeScriptVarsIntoEnvList` to keep override values off disk.
 * @returns {void}
 *
 * @example
 * persistEnvFile(
 *   { path: '/coll/environments/Dev.bru', format: 'bru' },
 *   { host: 'api.example.com', port: 3000 }
 * );
 * -> on-disk before:
 *   vars {
 *     host: localhost
 *   }
 * -> on-disk after:
 *   vars {
 *     host: api.example.com
 *     @number
 *     port: 3000
 *   }
 */
const persistEnvFile = (envFile, scriptVars, options = {}) => {
  // No descriptor means no `--env` flag was passed — nothing to persist to.
  if (!envFile || !envFile.path) return;
  const { path: filePath, format } = envFile;
  // An `--env-file` supplied alongside `--env` is merged into the same runtime map as this file but
  // is never itself written back, so it is another environment source for this file in exactly the
  // sense the `extends` chain is — same guard, same secret flags.
  const variablesFromOtherEnvironmentFiles = [
    ...(envFile.envFileVariables || []),
    ...(envFile.inheritedEnvironmentVariables || [])
  ];
  const mergeOptions = {
    ...options,
    skipKeys: keysLeftUnchanged(variablesFromOtherEnvironmentFiles, scriptVars),
    variablesFromOtherEnvironmentFiles
  };
  if (!fs.existsSync(filePath)) return;

  if (format === 'json') {
    const existingRaw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(existingRaw);
    // Validate shape, but merge against the raw `parsed.variables` so per-entry fields the
    // CLI doesn't recognize (uid, dataType, custom metadata) survive on entries the script
    // didn't touch — parseEnvironmentJson's normalizer would otherwise strip them.
    parseEnvironmentJson(parsed);

    const rawVariables = Array.isArray(parsed.variables) ? parsed.variables.filter(Boolean) : [];
    const mergedVars = mergeScriptVarsIntoEnvList(rawVariables, scriptVars, mergeOptions);
    // Spread preserves any top-level fields the user has beyond `variables` (name, metadata, etc.).
    const next = { ...parsed, variables: mergedVars };
    const content = JSON.stringify(next, null, 2) + '\n';
    writeIfChanged(filePath, content, existingRaw);
    return;
  }

  const existingRaw = fs.readFileSync(filePath, 'utf8');
  // Bru parser expects \n line endings; yml parser is tolerant.
  const sourceForParse = format === 'bru' ? existingRaw.replace(/\r\n/g, '\n') : existingRaw;
  const parsed = parseEnvironment(sourceForParse, { format });
  const mergedVars = mergeScriptVarsIntoEnvList(parsed.variables || [], scriptVars, mergeOptions);
  const next = { ...parsed, variables: mergedVars };
  const content = stringifyEnvironment(next, { format });
  writeIfChanged(filePath, content, existingRaw);
};

/**
 * Mutate the in-memory collection root and write it out. The mutation matters:
 * subsequent requests in the same iteration read `collection.root` and must see the updated vars.
 *
 * @param {{ root?: object, format: 'bru' | 'yml', brunoConfig?: object }} collection - Loaded collection; mutated in place.
 * @param {Object<string, any>} scriptCollVars - Flat map of collection vars the script declared.
 * @param {string} collectionRootPath - Absolute path to the collection root file (`collection.bru` / `opencollection.yml`).
 * @returns {void}
 *
 * @example
 * -> collection.root.request.vars.req before: [{ name: 'region', value: 'us', enabled: true, type: 'request' }]
 * persistCollectionVars(collection, { region: 'eu', retries: 3 }, '/coll/collection.bru');
 * -> collection.root.request.vars.req after:
 *   [
 *     { name: 'region',  value: 'eu', enabled: true, type: 'request' },
 *     { name: 'retries', value: 3,    enabled: true, type: 'request', dataType: 'number' }
 *   ]
 * -> `collection.bru` on disk is rewritten with the same content.
 */
const persistCollectionVars = (collection, scriptCollVars, collectionRootPath) => {
  if (!collection || !collectionRootPath) return;
  const collectionRoot = collection.root || {};
  collectionRoot.request = collectionRoot.request || {};
  collectionRoot.request.vars = collectionRoot.request.vars || {};
  const existingVars = collectionRoot.request.vars.req || [];
  const merged = mergeScriptVarsIntoCollectionVarsList(existingVars, scriptCollVars);
  collectionRoot.request.vars.req = merged;
  collection.root = collectionRoot;

  const format = collection.format;
  const content = stringifyCollection(collectionRoot, collection.brunoConfig || {}, { format });
  const existing = fs.existsSync(collectionRootPath) ? fs.readFileSync(collectionRootPath, 'utf8') : null;
  if (existing !== null) {
    writeIfChanged(collectionRootPath, content, existing);
  } else {
    fs.writeFileSync(collectionRootPath, content);
  }
};

/**
 * Disk-write counterpart to {@link applyVariableUpdates}.
 * Runtime vars are intentionally not persisted — they are ephemeral by definition.
 *
 * @param {{
 *   envVariables?: Object,
 *   collectionVariables?: Object,
 *   globalEnvironmentVariables?: Object,
 *   runtimeVariables?: Object
 * } | null} result - Runtime return value; any field may be null to indicate "unchanged".
 * @param {{
 *   envFile?: { path: string, format: 'json' | 'yml' | 'bru' },
 *   globalEnvFile?: { path: string, format: 'yml' },
 *   collection: object,
 *   collectionRootPath: string,
 *   envVarOverrides?: Map<string, string>,
 *   globalEnvVarOverrides?: Map<string, string>
 * }} targets - Where each kind of var should land on disk. `envVarOverrides` maps each
 *   CLI `--env-var name=value` to its injected value; that value is never persisted, but a
 *   deliberate same-named script write with a different value still reaches disk.
 *   `globalEnvVarOverrides` applies the same leak-guard to the global env file, seeded from
 *   `--global-env-var name=value`.
 *   `globalEnvFile.format` is yml-only because the CLI's `--global-env <name>` flag looks
 *   up `<workspace>/environments/<name>.yml` (no JSON/bru equivalent exists today).
 * @returns {void}
 *
 * @example
 * Script runs `bru.setEnvVar('token', 'abc')` and `bru.setCollectionVar('region', 'eu')`.
 * const result = {
 *   envVariables: { token: 'abc' },
 *   collectionVariables: { region: 'eu' },
 *   runtimeVariables: null,
 *   globalEnvironmentVariables: null
 * };
 * persistVariableUpdates(result, { envFile, globalEnvFile, collection, collectionRootPath });
 * -> writes `token: abc` into the active env file and `region: eu` into the collection root file.
 */
const persistVariableUpdates = (result, { envFile, globalEnvFile, collection, collectionRootPath, envVarOverrides, globalEnvVarOverrides }) => {
  if (!result) return;
  const envOpts = envVarOverrides ? { overrides: envVarOverrides } : undefined;
  if (result.envVariables) persistEnvFile(envFile, result.envVariables, envOpts);
  // Global env file gets its own leak-guard, seeded from `--global-env-var` overrides: a value
  // injected via the CLI and passed through unchanged never reaches the .yml, but a deliberate
  // `bru.setGlobalEnvVar` write of a different value still persists.
  const globalEnvOpts = globalEnvVarOverrides ? { overrides: globalEnvVarOverrides } : undefined;
  if (result.globalEnvironmentVariables) persistEnvFile(globalEnvFile, result.globalEnvironmentVariables, globalEnvOpts);
  if (result.collectionVariables) persistCollectionVars(collection, result.collectionVariables, collectionRootPath);
};

module.exports = {
  applyVariableUpdates,
  persistVariableUpdates,
  mergeScriptVarsIntoEnvList,
  mergeScriptVarsIntoCollectionVarsList
};
