import { getApiSpecPathKey } from 'utils/api-specs';

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
 * The workspace entry owns the display name (it is what Rename edits); the
 * watcher-derived name is only a fallback for an entry without one.
 *
 * @param {Array} workspaceApiSpecs - spec entries from the active workspace (each has `path`)
 * @param {Array} allApiSpecs - loaded specs in redux (each has `pathname`)
 * @returns {Array} loaded specs that correspond to the workspace entries, carrying the workspace name
 */
export const matchLoadedApiSpecs = (workspaceApiSpecs, allApiSpecs) => {
  if (!Array.isArray(workspaceApiSpecs)) return [];
  const loadedApiSpecs = Array.isArray(allApiSpecs) ? allApiSpecs : [];

  return workspaceApiSpecs
    .map((ws) => {
      const wsPathKey = getApiSpecPathKey(ws?.path);
      if (!wsPathKey) return undefined;
      const loadedSpec = loadedApiSpecs.find((apiSpec) => getApiSpecPathKey(apiSpec?.pathname) === wsPathKey);
      if (!loadedSpec) return undefined;
      return { ...loadedSpec, name: ws.name || loadedSpec.name };
    })
    .filter(Boolean);
};
