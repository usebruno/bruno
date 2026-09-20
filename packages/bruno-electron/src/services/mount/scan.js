const { JobType, getPool } = require('../pool');
const { buildTree } = require('./tree-builder');
const { defaultClassify, walk, resolveDenylist } = require('../../utils/mount');
const { getRequestUid } = require('../../cache/requestUids');
const { uuid } = require('../../utils/common');
const { parseValueByDataType } = require('@usebruno/common/utils');
const { decryptStringSafe } = require('../../utils/encryption');
const { transformBrunoConfigAfterRead } = require('../../utils/transformBrunoConfig');
const { setBrunoConfig } = require('../../store/bruno-config');
const EnvironmentSecretsStore = require('../../store/env-secrets');

let environmentSecretsStore = null;
const getEnvironmentSecretsStore = () => {
  if (!environmentSecretsStore) environmentSecretsStore = new EnvironmentSecretsStore();
  return environmentSecretsStore;
};

const envHasSecrets = (environment) =>
  Array.isArray(environment?.variables) && environment.variables.some((variable) => variable.secret);

// Mirrors addEnvironmentFile in app/collection-watcher.js, which is what runs for environments
// discovered after mount. Both must stay in step: variables get fresh uids, and secret values are
// decrypted and then coerced through the variable's dataType.
const hydrateEnvironments = (collectionPath, environments = []) => {
  for (const environment of environments) {
    for (const variable of environment.variables || []) {
      variable.uid = uuid();
    }

    if (!envHasSecrets(environment)) continue;

    try {
      const envSecrets = getEnvironmentSecretsStore().getEnvSecrets(collectionPath, environment) || [];
      for (const secret of envSecrets) {
        const variable = environment.variables.find((v) => v.name === secret.name && v.secret);
        if (!variable || !secret.value) continue;
        const decrypted = decryptStringSafe(secret.value);
        variable.value = parseValueByDataType(decrypted.value, variable.dataType);
      }
    } catch (err) {
      console.error(`[mount] environment secret hydration failed for ${environment.name}`, err);
    }
  }
};

// Cold-start scan for the default mount path (no file cache): walk the collection once and parse
// every file in full across the worker pool.
//
// Unlike the cache-backed path this keeps no state — nothing is persisted or reconciled, so the
// tree is always derived from what is on disk right now.
const scanCollection = async ({ collectionPath, collectionUid, denylist }) => {
  const resolvedDenylist = resolveDenylist(denylist);

  const walkStartedAt = performance.now();
  const toParse = [];
  for (const { relativePath } of await walk(collectionPath, resolvedDenylist)) {
    const classified = defaultClassify(relativePath);
    if (!classified) continue;
    toParse.push({ relativePath, format: classified.format, type: classified.type });
  }
  const walkMs = performance.now() - walkStartedAt;

  const parseStartedAt = performance.now();
  const entries = new Map();
  if (toParse.length > 0) {
    const pool = getPool();
    await Promise.allSettled(
      toParse.map(async (entry) => {
        try {
          entries.set(entry.relativePath, await pool.run(JobType.ParseFile, {
            collectionPath,
            relativePath: entry.relativePath,
            format: entry.format,
            type: entry.type
          }));
        } catch (err) {
          entries.set(entry.relativePath, {
            relativePath: entry.relativePath,
            error: { message: err.message, stack: err.stack }
          });
        }
      })
    );
  }

  const parseMs = performance.now() - parseStartedAt;

  const buildStartedAt = performance.now();
  const tree = buildTree(collectionPath, entries, { uidFor: getRequestUid });
  const buildMs = performance.now() - buildStartedAt;

  // The watcher runs with ignoreInitial, so nothing else populates these at mount: the bruno
  // config has to reach the main-process store (the watcher's ignore predicate and the network
  // layer read it from there) and environment secrets have to be decrypted.
  if (tree.brunoConfig) {
    try {
      tree.brunoConfig = await transformBrunoConfigAfterRead(tree.brunoConfig, collectionPath);
      setBrunoConfig(collectionUid, tree.brunoConfig);
    } catch (err) {
      console.error(`[mount:${collectionUid}] brunoConfig transform failed`, err);
    }
  }

  hydrateEnvironments(collectionPath, tree.environments);

  // Surfaced in Collection Overview so a slow mount can be attributed to a phase instead of
  // guessed at. `parseMs` is wall-clock across the worker pool, not summed CPU time, so on a
  // machine with N cores it is roughly the total parse cost divided by N.
  tree.loadStats = {
    fileCount: toParse.length,
    walkMs: Math.round(walkMs),
    parseMs: Math.round(parseMs),
    buildMs: Math.round(buildMs),
    scanMs: Math.round(performance.now() - walkStartedAt)
  };

  return tree;
};

module.exports = { scanCollection };
