import { useEffect, useRef, useState } from 'react';
import { getAbsoluteFilePath } from 'utils/common/path';
import { existsSync } from 'utils/filesystem';

/**
 * Checks whether the given file paths (resolved against `basePath`) exist on disk.
 *
 * The hook only reports what it observed — callers own the "should I warn" policy.
 * A sequence counter discards results from superseded runs so rapid input changes
 * can't leave stale results on screen.
 *
 * @param {string[]} paths - Relative or absolute file paths to check.
 * @param {string} basePath - Base directory that relative paths are resolved against.
 *   When falsy, the hook stays in the 'idle' state without issuing any check.
 * @returns {{ status: 'idle' | 'checking' | 'ready' | 'error', missingPaths: string[] }}
 *   - `'idle'`     — nothing to check (empty input or no `basePath`)
 *   - `'checking'` — a check is in flight; `missingPaths` is empty
 *   - `'ready'`    — check completed; `missingPaths` lists paths that don't exist
 *   - `'error'`    — the check itself failed (e.g. IPC threw); `missingPaths` is empty
 */
const useMissingFileCheck = (paths, basePath) => {
  const [state, setState] = useState({ status: 'idle', missingPaths: [] });
  const seqRef = useRef(0);
  const pathsRef = useRef(paths);
  pathsRef.current = paths;

  // Content-based key so re-renders that pass a fresh array with the same
  // contents don't retrigger the check.
  const pathsKey = paths.join('\0');

  useEffect(() => {
    const currentPaths = pathsRef.current;
    if (!currentPaths.length || !basePath) {
      setState({ status: 'idle', missingPaths: [] });
      return;
    }

    const seq = ++seqRef.current;
    setState({ status: 'checking', missingPaths: [] });

    Promise.all(
      currentPaths.map(async (filePath) => {
        const exists = await existsSync(getAbsoluteFilePath(basePath, filePath));
        return { filePath, exists };
      })
    ).then(
      (results) => {
        if (seq !== seqRef.current) return;
        setState({
          status: 'ready',
          missingPaths: results.filter((r) => !r.exists).map((r) => r.filePath)
        });
      },
      () => {
        if (seq !== seqRef.current) return;
        setState({ status: 'error', missingPaths: [] });
      }
    );
  }, [pathsKey, basePath]);

  return state;
};

export default useMissingFileCheck;
