import { uuid } from '../common';
import { flattenObject } from '../utils/flatten';

/**
 * Converts an Insomnia environment node into a Bruno environment using JSON-path-like keys.
 * - Flattens env.data to dot-notation keys; values are converted to strings.
 */
export const toBrunoEnv = (env, index = 0) => {
  const variables = [];
  const flatEnvData = flattenObject(env?.data || {});
  Object.entries(flatEnvData).forEach(([name, value]) => {
    variables.push({
      uid: uuid(),
      name,
      value: String(value),
      type: 'text',
      enabled: true,
      secret: false
    });
  });

  return {
    uid: uuid(),
    name: (env?.name && String(env.name).trim()) || `Environment ${index + 1}`,
    variables
  };
};

/**
 * Shallowly merges two flattened env data objects.
 * - Keys in override replace keys in base.
 * - No recursive merging.
 */
const shallowMergeFlat = (baseFlat = {}, overrideFlat = {}) => ({ ...baseFlat, ...overrideFlat });

/**
 * Builds Bruno environments from Insomnia v5 environments.
 * - Expects a single object (base env) with optional subEnvironments.
 * - Creates one env for base and one env per sub using flattened, shallow-merged keys.
 */
export const buildV5Environments = (baseEnv) => {
  if (!baseEnv || typeof baseEnv !== 'object') return [];

  const result = [];

  // include base as standalone
  result.push(toBrunoEnv(baseEnv));

  const subs = Array.isArray(baseEnv.subEnvironments) ? baseEnv.subEnvironments : [];
  const baseFlat = flattenObject(baseEnv?.data || {});
  subs.forEach((sub, i) => {
    const subFlat = flattenObject(sub?.data || {});
    const mergedFlat = shallowMergeFlat(baseFlat, subFlat);
    result.push(toBrunoEnv({ name: sub?.name, data: mergedFlat }, i + 1));
  });
  return result;
};

/**
 * Builds Bruno environments from Insomnia v4 resources.
 * - Base env: parentId equals workspaceId; included as-is (flattened).
 * - Sub envs: merge base (flattened) with sub (flattened) and import.
 *
 * Note: Insomnia supports only ONE base environment per workspace.
 */
export const buildV4Environments = (resources, workspaceId) => {
  const allEnvResources = resources.filter((r) => r._type === 'environment') || [];
  const envById = {};
  allEnvResources.forEach((e) => (envById[e._id] = e));

  const isBaseEnv = (env) => env.parentId === workspaceId;

  const result = [];

  const baseEnv = allEnvResources.find(isBaseEnv);
  if (baseEnv) {
    result.push(toBrunoEnv(baseEnv));
  }

  // sub envs - all inherit from the single base environment
  const subEnvs = allEnvResources.filter((e) => !isBaseEnv(e));
  const baseFlat = flattenObject(baseEnv?.data || {});
  subEnvs.forEach((sub, idx) => {
    const subFlat = flattenObject(sub.data || {});
    const mergedFlat = shallowMergeFlat(baseFlat, subFlat);
    result.push(toBrunoEnv({ name: sub.name, data: mergedFlat }, idx + 1));
  });

  return result;
};
