/**
 * Strip comments and string literals from code so searches
 * only match live (uncommented, non-string) API calls.
 * Replaces matches with spaces to preserve line structure and offsets.
 */
const stripCommentsAndStrings = (code) => {
  return code.replace(
    /\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g,
    (match) => ' '.repeat(match.length)
  );
};

/**
 * Find the 1-indexed line number where `searchText` first appears in `source`.
 * Returns null if not found.
 */
const findLineInSource = (source, searchText) => {
  if (!source || !searchText) return null;

  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchText)) {
      return i + 1;
    }
  }
  return null;
};

/**
 * Extract context lines around `lineNumber` from `source`.
 * Returns { lines: [{ lineNumber, content, isHighlighted }], highlightedLine }
 * Compatible with CodeSnippet component props.
 */
const getScriptContext = (source, lineNumber, contextLines = 3) => {
  if (!source || !lineNumber || lineNumber < 1) return null;

  const lines = source.split('\n');
  if (lineNumber > lines.length) return null;

  const startLine = Math.max(1, lineNumber - contextLines);
  const endLine = Math.min(lines.length, lineNumber + contextLines);

  const contextLinesArray = [];
  for (let i = startLine; i <= endLine; i++) {
    contextLinesArray.push({
      lineNumber: i,
      content: lines[i - 1],
      isHighlighted: i === lineNumber
    });
  }

  return { lines: contextLinesArray, highlightedLine: lineNumber };
};

/**
 * Build a unified diff-style view for multiple warning lines in a script.
 * Returns an array of hunks, each with lines and a hasSeparatorBefore flag,
 * or null if no valid line numbers.
 */
const getUnifiedScriptContext = (source, lineNumbers, contextLines = 3) => {
  if (!source || !lineNumbers?.length) return null;

  const sourceLines = source.split('\n');
  const totalLines = sourceLines.length;

  // Deduplicate, filter invalid, sort
  const validLines = [...new Set(lineNumbers)]
    .filter((n) => n >= 1 && n <= totalLines)
    .sort((a, b) => a - b);

  if (!validLines.length) return null;

  // Compute ranges [start, end] for each highlighted line
  const ranges = validLines.map((line) => [
    Math.max(1, line - contextLines),
    Math.min(totalLines, line + contextLines)
  ]);

  // Merge overlapping/adjacent ranges
  const merged = [ranges[0]];
  for (let i = 1; i < ranges.length; i++) {
    const prev = merged[merged.length - 1];
    if (ranges[i][0] <= prev[1] + 1) {
      prev[1] = Math.max(prev[1], ranges[i][1]);
    } else {
      merged.push(ranges[i]);
    }
  }

  const highlightSet = new Set(validLines);

  return merged.map((range, idx) => {
    const lines = [];
    for (let i = range[0]; i <= range[1]; i++) {
      lines.push({
        lineNumber: i,
        content: sourceLines[i - 1],
        isHighlighted: highlightSet.has(i)
      });
    }
    // Separator before if: first hunk doesn't start at line 1, or subsequent hunks after a gap
    const hasSeparatorBefore = idx === 0 ? range[0] > 1 : true;
    return { lines, hasSeparatorBefore };
  });
};

/**
 * Get the script source for a given phase from a root object (collection root or folder root).
 */
const getScriptFromRoot = (root, scriptPhase) => {
  if (!root) return null;
  if (scriptPhase === 'pre-request') return root?.request?.script?.req || null;
  if (scriptPhase === 'post-response') return root?.request?.script?.res || null;
  if (scriptPhase === 'test') return root?.request?.tests || null;
  return null;
};

/**
 * Compute a relative file path by stripping the collection pathname prefix.
 */
const getRelativePath = (collectionPathname, fullPath) => {
  if (!collectionPathname || !fullPath) return fullPath || '';
  if (fullPath.startsWith(collectionPathname)) {
    const rel = fullPath.slice(collectionPathname.length);
    return rel.startsWith('/') ? rel.slice(1) : rel;
  }
  return fullPath;
};

/**
 * Build ordered script source levels (collection → folders → request) and search
 * each for warning paths. Returns grouped results with labels and hunks, or null
 * if no warnings could be located in any source.
 *
 * @param {string[]} paths - warning API paths (e.g. ['pm.vault.get', 'pm.cookies.jar'])
 * @param {object} item - the request item
 * @param {object} collection - the collection object
 * @param {string} scriptPhase - 'pre-request' | 'post-response' | 'test'
 * @param {function} getTreePath - function(collection, item) → path array (for testability)
 * @returns {Array<{ label: string, sourceType: string, sourceUid?: string, filePath: string, hunks: Array, paths: string[] }> | null}
 */
const getWarningSourceGroups = (paths, item, collection, scriptPhase, getTreePath) => {
  if (!paths?.length) return null;

  const collectionPathname = collection?.pathname || '';

  // Build ordered source levels
  const sources = [];

  // Collection root
  const collectionRoot = collection?.draft?.root || collection?.root;
  const collectionSource = getScriptFromRoot(collectionRoot, scriptPhase);
  if (collectionSource) {
    sources.push({
      label: 'Collection Script',
      source: collectionSource,
      strippedSource: stripCommentsAndStrings(collectionSource),
      sourceType: 'collection',
      filePath: 'collection.bru'
    });
  }

  // Folders (from tree path, excluding the item itself)
  if (getTreePath) {
    const treePath = getTreePath(collection, item);
    if (treePath?.length) {
      for (const node of treePath) {
        if (node?.type === 'folder') {
          const folderRoot = node.draft || node.root;
          const folderSource = getScriptFromRoot(folderRoot, scriptPhase);
          if (folderSource) {
            const folderFilePath = node.pathname
              ? getRelativePath(collectionPathname, node.pathname + '/folder.bru')
              : 'folder.bru';
            sources.push({
              label: `Folder: ${node.name}`,
              source: folderSource,
              strippedSource: stripCommentsAndStrings(folderSource),
              sourceType: 'folder',
              sourceUid: node.uid,
              filePath: folderFilePath
            });
          }
        }
      }
    }
  }

  // Request level
  const requestSource = getScriptFromRoot(item?.draft || item, scriptPhase);
  if (requestSource) {
    const requestFilePath = item?.pathname
      ? getRelativePath(collectionPathname, item.pathname)
      : '';
    sources.push({
      label: 'Request Script',
      source: requestSource,
      strippedSource: stripCommentsAndStrings(requestSource),
      sourceType: 'request',
      filePath: requestFilePath
    });
  }

  if (!sources.length) return null;

  // Attribute each warning path to the first source where found
  const attributed = new Map(); // sourceIndex → [paths]
  const assignedPaths = new Set();

  for (const apiPath of paths) {
    for (let i = 0; i < sources.length; i++) {
      const lineNumber = findLineInSource(sources[i].strippedSource, apiPath);
      if (lineNumber) {
        if (!attributed.has(i)) attributed.set(i, []);
        attributed.get(i).push(apiPath);
        assignedPaths.add(apiPath);
        break;
      }
    }
  }

  if (!assignedPaths.size) return null;

  // Build groups in source order
  const groups = [];
  const sortedIndices = [...attributed.keys()].sort((a, b) => a - b);

  for (const idx of sortedIndices) {
    const { label, source, strippedSource, sourceType, sourceUid, filePath } = sources[idx];
    const groupPaths = attributed.get(idx);
    const lineNumbers = [];

    for (const apiPath of groupPaths) {
      const lineNumber = findLineInSource(strippedSource, apiPath);
      if (lineNumber) lineNumbers.push(lineNumber);
    }

    const hunks = getUnifiedScriptContext(source, lineNumbers, 3);
    if (hunks) {
      const group = { label, sourceType, filePath, hunks, paths: groupPaths };
      if (sourceUid) group.sourceUid = sourceUid;
      groups.push(group);
    }
  }

  return groups.length ? groups : null;
};

export { findLineInSource, getScriptContext, getUnifiedScriptContext, getWarningSourceGroups };
