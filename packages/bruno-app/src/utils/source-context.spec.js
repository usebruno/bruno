import { findLineInSource, getScriptContext, getUnifiedScriptContext, getWarningSourceGroups } from './source-context';

describe('findLineInSource', () => {
  it('should find correct line number for matching text', () => {
    const source = 'line one\nline two\nline three';
    expect(findLineInSource(source, 'line two')).toBe(2);
  });

  it('should return 1 for match on first line', () => {
    const source = 'first line\nsecond line';
    expect(findLineInSource(source, 'first line')).toBe(1);
  });

  it('should return null for missing text', () => {
    const source = 'line one\nline two\nline three';
    expect(findLineInSource(source, 'not here')).toBeNull();
  });

  it('should return null for null source', () => {
    expect(findLineInSource(null, 'text')).toBeNull();
  });

  it('should return null for null searchText', () => {
    expect(findLineInSource('some source', null)).toBeNull();
  });

  it('should return null for empty source', () => {
    expect(findLineInSource('', 'text')).toBeNull();
  });

  it('should return null for empty searchText', () => {
    expect(findLineInSource('some source', '')).toBeNull();
  });

  it('should find first occurrence when text appears multiple times', () => {
    const source = 'line one\npm.vault.get("a")\nother\npm.vault.get("b")';
    expect(findLineInSource(source, 'pm.vault.get')).toBe(2);
  });
});

describe('getScriptContext', () => {
  const source = [
    'const a = 1;',
    'const b = 2;',
    'const c = 3;',
    'pm.vault.get("secret");',
    'const d = 4;',
    'const e = 5;',
    'const f = 6;'
  ].join('\n');

  it('should return correct context lines around the target line', () => {
    const result = getScriptContext(source, 4, 2);
    expect(result).not.toBeNull();
    expect(result.highlightedLine).toBe(4);
    expect(result.lines).toHaveLength(5);
    expect(result.lines[0].lineNumber).toBe(2);
    expect(result.lines[2].lineNumber).toBe(4);
    expect(result.lines[2].isHighlighted).toBe(true);
    expect(result.lines[2].content).toBe('pm.vault.get("secret");');
    expect(result.lines[4].lineNumber).toBe(6);
  });

  it('should handle first line correctly', () => {
    const result = getScriptContext(source, 1, 2);
    expect(result.lines[0].lineNumber).toBe(1);
    expect(result.lines[0].isHighlighted).toBe(true);
    expect(result.lines).toHaveLength(3);
  });

  it('should handle last line correctly', () => {
    const result = getScriptContext(source, 7, 2);
    expect(result.lines[result.lines.length - 1].lineNumber).toBe(7);
    expect(result.lines[result.lines.length - 1].isHighlighted).toBe(true);
  });

  it('should handle short scripts', () => {
    const shortSource = 'only line';
    const result = getScriptContext(shortSource, 1, 3);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].isHighlighted).toBe(true);
  });

  it('should return null for null source', () => {
    expect(getScriptContext(null, 1)).toBeNull();
  });

  it('should return null for invalid line number', () => {
    expect(getScriptContext(source, 0)).toBeNull();
    expect(getScriptContext(source, -1)).toBeNull();
  });

  it('should return null for line number beyond source', () => {
    expect(getScriptContext(source, 100)).toBeNull();
  });

  it('should mark only the target line as highlighted', () => {
    const result = getScriptContext(source, 4, 3);
    const highlightedLines = result.lines.filter((l) => l.isHighlighted);
    expect(highlightedLines).toHaveLength(1);
    expect(highlightedLines[0].lineNumber).toBe(4);
  });
});

describe('getUnifiedScriptContext', () => {
  // 20-line source for testing
  const lines = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`);
  const source = lines.join('\n');

  it('should return two hunks with separator for distant warnings', () => {
    const result = getUnifiedScriptContext(source, [3, 17], 2);
    expect(result).toHaveLength(2);
    // First hunk: lines 1-5
    expect(result[0].lines[0].lineNumber).toBe(1);
    expect(result[0].lines[result[0].lines.length - 1].lineNumber).toBe(5);
    expect(result[0].hasSeparatorBefore).toBe(false);
    // Second hunk: lines 15-19
    expect(result[1].lines[0].lineNumber).toBe(15);
    expect(result[1].lines[result[1].lines.length - 1].lineNumber).toBe(19);
    expect(result[1].hasSeparatorBefore).toBe(true);
  });

  it('should merge overlapping contexts into one hunk', () => {
    const result = getUnifiedScriptContext(source, [5, 8], 3);
    expect(result).toHaveLength(1);
    // Merged range: lines 2-11
    expect(result[0].lines[0].lineNumber).toBe(2);
    expect(result[0].lines[result[0].lines.length - 1].lineNumber).toBe(11);
    // Both lines highlighted
    const highlighted = result[0].lines.filter((l) => l.isHighlighted);
    expect(highlighted).toHaveLength(2);
    expect(highlighted[0].lineNumber).toBe(5);
    expect(highlighted[1].lineNumber).toBe(8);
  });

  it('should handle adjacent lines as single hunk with both highlighted', () => {
    const result = getUnifiedScriptContext(source, [10, 11], 2);
    expect(result).toHaveLength(1);
    const highlighted = result[0].lines.filter((l) => l.isHighlighted);
    expect(highlighted).toHaveLength(2);
  });

  it('should deduplicate line numbers', () => {
    const result = getUnifiedScriptContext(source, [5, 5, 5], 2);
    expect(result).toHaveLength(1);
    const highlighted = result[0].lines.filter((l) => l.isHighlighted);
    expect(highlighted).toHaveLength(1);
  });

  it('should set hasSeparatorBefore false when warning is on line 1', () => {
    const result = getUnifiedScriptContext(source, [1], 3);
    expect(result).toHaveLength(1);
    expect(result[0].hasSeparatorBefore).toBe(false);
    expect(result[0].lines[0].lineNumber).toBe(1);
  });

  it('should set hasSeparatorBefore true when lines are hidden above first hunk', () => {
    const result = getUnifiedScriptContext(source, [10], 2);
    expect(result).toHaveLength(1);
    expect(result[0].hasSeparatorBefore).toBe(true);
    expect(result[0].lines[0].lineNumber).toBe(8);
  });

  it('should return null for all invalid line numbers', () => {
    expect(getUnifiedScriptContext(source, [0, -1, 100])).toBeNull();
  });

  it('should return null for empty source', () => {
    expect(getUnifiedScriptContext('', [1])).toBeNull();
  });

  it('should return null for null source', () => {
    expect(getUnifiedScriptContext(null, [1])).toBeNull();
  });

  it('should return null for empty line numbers array', () => {
    expect(getUnifiedScriptContext(source, [])).toBeNull();
  });
});

describe('getWarningSourceGroups', () => {
  const mockGetTreePath = (collection, item) => collection._treePath || [];

  const makeCollection = (scriptReq, treePath) => ({
    pathname: '/home/user/my-collection',
    root: { request: { script: { req: scriptReq } } },
    _treePath: treePath || []
  });

  const makeFolder = (name, scriptReq, pathname) => ({
    type: 'folder',
    name,
    uid: `folder-${name}-uid`,
    pathname: pathname || `/home/user/my-collection/${name}`,
    root: { request: { script: { req: scriptReq } } }
  });

  const makeItem = (scriptReq, pathname) => ({
    uid: 'item-uid',
    pathname: pathname || '/home/user/my-collection/request.bru',
    request: { script: { req: scriptReq } }
  });

  it('should find warning in collection script only', () => {
    const collection = makeCollection('const a = 1;\npm.vault.get("secret");\nconst b = 2;');
    const item = makeItem('const x = 1;');
    const result = getWarningSourceGroups(['pm.vault.get'], item, collection, 'pre-request', mockGetTreePath);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Collection Script');
    expect(result[0].sourceType).toBe('collection');
    expect(result[0].filePath).toBe('collection.bru');
    expect(result[0].sourceUid).toBeUndefined();
    expect(result[0].paths).toEqual(['pm.vault.get']);
    expect(result[0].hunks).not.toBeNull();
  });

  it('should find warning in folder script', () => {
    const folder = makeFolder('auth', 'const a = 1;\npm.vault.get("key");\nconst b = 2;');
    const collection = makeCollection('const clean = true;', [folder]);
    const item = makeItem('const x = 1;');
    const result = getWarningSourceGroups(['pm.vault.get'], item, collection, 'pre-request', mockGetTreePath);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Folder: auth');
    expect(result[0].sourceType).toBe('folder');
    expect(result[0].sourceUid).toBe('folder-auth-uid');
    expect(result[0].filePath).toBe('auth/folder.bru');
    expect(result[0].paths).toEqual(['pm.vault.get']);
  });

  it('should find warning in request script', () => {
    const collection = makeCollection('const clean = true;');
    const item = makeItem('const a = 1;\npm.cookies.jar();\nconst b = 2;');
    const result = getWarningSourceGroups(['pm.cookies.jar'], item, collection, 'pre-request', mockGetTreePath);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Request Script');
    expect(result[0].sourceType).toBe('request');
    expect(result[0].filePath).toBe('request.bru');
    expect(result[0].sourceUid).toBeUndefined();
    expect(result[0].paths).toEqual(['pm.cookies.jar']);
  });

  it('should split warnings across collection and request into two groups', () => {
    const collection = makeCollection('const a = 1;\npm.vault.get("secret");\nconst b = 2;');
    const item = makeItem('const x = 1;\npm.cookies.jar();\nconst y = 2;');
    const result = getWarningSourceGroups(
      ['pm.vault.get', 'pm.cookies.jar'], item, collection, 'pre-request', mockGetTreePath
    );

    expect(result).toHaveLength(2);
    expect(result[0].label).toBe('Collection Script');
    expect(result[0].sourceType).toBe('collection');
    expect(result[0].paths).toEqual(['pm.vault.get']);
    expect(result[1].label).toBe('Request Script');
    expect(result[1].sourceType).toBe('request');
    expect(result[1].paths).toEqual(['pm.cookies.jar']);
  });

  it('should attribute warning to first source where found (collection before request)', () => {
    const collection = makeCollection('pm.vault.get("a");');
    const item = makeItem('pm.vault.get("b");');
    const result = getWarningSourceGroups(['pm.vault.get'], item, collection, 'pre-request', mockGetTreePath);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Collection Script');
  });

  it('should return null when warning not found in any source', () => {
    const collection = makeCollection('const clean = true;');
    const item = makeItem('const x = 1;');
    const result = getWarningSourceGroups(['pm.vault.get'], item, collection, 'pre-request', mockGetTreePath);

    expect(result).toBeNull();
  });

  it('should return null when no sources have scripts', () => {
    const collection = { root: {} };
    const item = {};
    const result = getWarningSourceGroups(['pm.vault.get'], item, collection, 'pre-request', mockGetTreePath);

    expect(result).toBeNull();
  });

  it('should return null for empty paths', () => {
    const collection = makeCollection('pm.vault.get("a");');
    const item = makeItem('const x = 1;');
    expect(getWarningSourceGroups([], item, collection, 'pre-request', mockGetTreePath)).toBeNull();
  });

  it('should return null for null paths', () => {
    expect(getWarningSourceGroups(null, {}, {}, 'pre-request', mockGetTreePath)).toBeNull();
  });

  it('should handle post-response script phase', () => {
    const collection = {
      root: { request: { script: { res: 'pm.vault.get("secret");' } } }
    };
    const item = { request: { script: { res: 'const x = 1;' } } };
    const result = getWarningSourceGroups(['pm.vault.get'], item, collection, 'post-response', mockGetTreePath);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Collection Script');
  });

  it('should handle test script phase', () => {
    const collection = { root: { request: { tests: 'pm.vault.get("secret");' } } };
    const item = { request: { tests: 'const x = 1;' } };
    const result = getWarningSourceGroups(['pm.vault.get'], item, collection, 'test', mockGetTreePath);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Collection Script');
  });

  it('should prefer collection draft over root', () => {
    const collection = {
      root: { request: { script: { req: 'const clean = true;' } } },
      draft: { root: { request: { script: { req: 'pm.vault.get("draft");' } } } }
    };
    const item = makeItem('const x = 1;');
    const result = getWarningSourceGroups(['pm.vault.get'], item, collection, 'pre-request', mockGetTreePath);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Collection Script');
  });

  it('should work without getTreePath function', () => {
    const collection = makeCollection('pm.vault.get("a");');
    const item = makeItem('const x = 1;');
    const result = getWarningSourceGroups(['pm.vault.get'], item, collection, 'pre-request');

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Collection Script');
  });

  it('should skip single-line commented-out API and attribute to next source', () => {
    const collection = makeCollection('// pm.vault.get("commented out");');
    const folder = makeFolder('auth', 'pm.vault.get("live");');
    const collectionWithFolder = makeCollection('// pm.vault.get("commented out");', [folder]);
    const item = makeItem('const x = 1;');
    const result = getWarningSourceGroups(['pm.vault.get'], item, collectionWithFolder, 'pre-request', mockGetTreePath);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Folder: auth');
    expect(result[0].sourceType).toBe('folder');
  });

  it('should skip block-commented API and attribute to next source', () => {
    const collection = makeCollection('/* pm.vault.get("blocked") */');
    const item = makeItem('pm.vault.get("live");');
    const result = getWarningSourceGroups(['pm.vault.get'], item, collection, 'pre-request', mockGetTreePath);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Request Script');
    expect(result[0].sourceType).toBe('request');
  });

  it('should skip API inside string literals and attribute to next source', () => {
    const collection = makeCollection('const msg = "pm.vault.get is deprecated";');
    const item = makeItem('pm.vault.get("live");');
    const result = getWarningSourceGroups(['pm.vault.get'], item, collection, 'pre-request', mockGetTreePath);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Request Script');
    expect(result[0].sourceType).toBe('request');
  });

  it('should return null when API only appears in comments across all sources', () => {
    const collection = makeCollection('// pm.vault.get("commented");');
    const item = makeItem('/* pm.vault.get("also commented") */');
    const result = getWarningSourceGroups(['pm.vault.get'], item, collection, 'pre-request', mockGetTreePath);

    expect(result).toBeNull();
  });
});
