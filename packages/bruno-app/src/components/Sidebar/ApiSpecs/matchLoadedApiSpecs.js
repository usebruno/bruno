import { normalizePath } from 'utils/common/path';

/**
 * Pairs each workspace API spec entry (from workspace.yml) with its loaded
 * counterpart in the redux store, matching by normalized (posixified) path.
 *
 * The two paths are derived independently: the workspace entry's path is stored
 * posixified (forward slashes) in workspace.yml, while the loaded spec's pathname
 * comes from the file watcher in native form (backslashes on Windows). A raw
 * `===` compare therefore fails on Windows (`C:/ws/api.yaml` !== `C:\ws\api.yaml`),
 * which hides the spec from the sidebar until a workspace switch. Normalizing both
 * sides makes them match on Windows while being a no-op on macOS/Linux.
 *
 * @param {Array} workspaceApiSpecs - spec entries from the active workspace (each has `path`)
 * @param {Array} allApiSpecs - loaded specs in redux (each has `pathname`)
 * @returns {Array} loaded specs that correspond to the workspace entries
 */
export const matchLoadedApiSpecs = (workspaceApiSpecs, allApiSpecs) => {
  if (!Array.isArray(workspaceApiSpecs)) return [];
  const loadedApiSpecs = Array.isArray(allApiSpecs) ? allApiSpecs : [];

  return workspaceApiSpecs
    .map((ws) => {
      const wsPath = normalizePath(ws?.path);
      if (!wsPath) return undefined;
      return loadedApiSpecs.find((apiSpec) => normalizePath(apiSpec?.pathname) === wsPath);
    })
    .filter(Boolean);
};
