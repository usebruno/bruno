const path = require('path');
const fs = require('fs');
const os = require('os');
const { runScriptInNodeVm } = require('@usebruno/js');
const { parseBruFileMeta, wrapAndJoinScripts, mergeScripts } = require('../../src/utils/collection');

describe('parseBruFileMeta', () => {
  test('parses valid meta block correctly', () => {
    const data = `meta {
      name: 0.2_mb
      type: http
      seq: 1
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'http-request',
      name: '0.2_mb',
      seq: 1,
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });

  test('returns null for missing meta block', () => {
    const data = `someOtherBlock {
      key: value
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toBeNull();
  });

  test('handles empty meta block gracefully', () => {
    const data = `meta {}`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'http-request',
      name: undefined,
      seq: 1,
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });

  test('ignores invalid lines in meta block', () => {
    const data = `meta {
      name: 0.2_mb
      invalidLine
      seq: 1
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'http-request',
      name: '0.2_mb',
      seq: 1,
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });

  test('handles unexpected input gracefully', () => {
    const data = null;

    const result = parseBruFileMeta(data);

    expect(result).toBeNull();
  });

  test('handles missing colon gracefully', () => {
    const data = `meta {
      name 0.2_mb
      seq: 1
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'http-request',
      name: undefined,
      seq: 1,
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });

  test('parses numeric values correctly', () => {
    const data = `meta {
      numValue: 1234
      floatValue: 12.34
      strValue: some_text
      seq: 5
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'http-request',
      name: undefined,
      seq: 5,
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });

  test('handles syntax error in meta block 1', () => {
    const data = `meta 
      name: 0.2_mb
      type: http
      seq: 1
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toBeNull();
  });

  test('handles syntax error in meta block 2', () => {
    const data = `meta {
      name: 0.2_mb
      type: http
      seq: 1
    `;

    const result = parseBruFileMeta(data);

    expect(result).toBeNull();
  });

  test('handles graphql type correctly', () => {
    const data = `meta {
      name: graphql_query
      type: graphql
      seq: 2
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'graphql-request',
      name: 'graphql_query',
      seq: 2,
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });

  test('handles unknown type correctly', () => {
    const data = `meta {
      name: unknown_request
      type: unknown
      seq: 3
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'http-request',
      name: 'unknown_request',
      seq: 3,
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });

  test('handles missing seq gracefully', () => {
    const data = `meta {
      name: no_seq_request
      type: http
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      type: 'http-request',
      name: 'no_seq_request',
      seq: 1, // Default fallback
      settings: {},
      tags: [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    });
  });
});

describe('wrapAndJoinScripts', () => {
  test('returns empty code and null metadata for all empty scripts', () => {
    const result = wrapAndJoinScripts(['', '', ''], 2);
    expect(result.code).toBe('');
    expect(result.metadata).toBeNull();
  });

  test('tracks request line range for single request script', () => {
    const result = wrapAndJoinScripts(['', '', 'console.log("hello");'], 2);
    expect(result.code).toContain('console.log("hello")');
    expect(result.metadata).toEqual({
      requestStartLine: 1,
      requestEndLine: 3
    });
  });

  test('tracks correct request line range with collection script before it', () => {
    const result = wrapAndJoinScripts(['let x = 1;', '', 'let y = 2;'], 2);
    // Collection script: 3 lines (IIFE opener + body + closer; args stay on the opener)
    // Empty gap: 1 line (blank line separator)
    // Request script starts at line 5
    expect(result.metadata.requestStartLine).toBe(5);
    expect(result.metadata.requestEndLine).toBe(7);
  });

  test('produces zero range metadata when request script is empty but others exist', () => {
    const result = wrapAndJoinScripts(['let x = 1;', '', ''], 2);
    expect(result.code).toContain('let x = 1');
    expect(result.metadata).toEqual({
      requestStartLine: 0,
      requestEndLine: 0
    });
  });

  test('builds segments array from segmentSources', () => {
    const sources = [
      { filePath: '/col/collection.bru', displayPath: 'collection.bru' },
      null,
      null
    ];
    const result = wrapAndJoinScripts(['let x = 1;', '', 'let y = 2;'], 2, { segmentSources: sources });
    expect(result.metadata.segments).toHaveLength(1);
    expect(result.metadata.segments[0]).toMatchObject({
      startLine: 1,
      endLine: 3,
      filePath: '/col/collection.bru',
      displayPath: 'collection.bru'
    });
  });

  test('builds segments for collection + folder + request', () => {
    const sources = [
      { filePath: '/col/collection.bru', displayPath: 'collection.bru' },
      { filePath: '/col/sub/folder.bru', displayPath: 'sub/folder.bru' },
      null
    ];
    const result = wrapAndJoinScripts(
      ['let a = 1;', 'let b = 2;', 'let c = 3;'],
      2,
      { segmentSources: sources }
    );
    expect(result.metadata.segments).toHaveLength(2);
    expect(result.metadata.segments[0].displayPath).toBe('collection.bru');
    expect(result.metadata.segments[1].displayPath).toBe('sub/folder.bru');
    expect(result.metadata.requestStartLine).toBeGreaterThan(result.metadata.segments[1].endLine);
  });

  test('binds per-segment __dirname/__filename via IIFE args when filePath is provided', () => {
    const colDir = path.resolve('/col');
    const collectionFile = path.join(colDir, 'collection.bru');
    const subDir = path.join(colDir, 'sub');
    const folderFile = path.join(subDir, 'folder.bru');
    const requestFile = path.join(subDir, 'req.bru');
    const sources = [
      { filePath: collectionFile, displayPath: 'collection.bru' },
      { filePath: folderFile, displayPath: path.join('sub', 'folder.bru') },
      null
    ];
    const requestSegmentSource = { filePath: requestFile, displayPath: path.join('sub', 'req.bru') };
    const result = wrapAndJoinScripts(
      ['let a = 1;', 'let b = 2;', 'let c = 3;'],
      2,
      { segmentSources: sources, requestSegmentSource }
    );

    expect(result.code).toContain('async (__dirname, __filename) => {');
    expect(result.code).toContain(`)(${JSON.stringify(colDir)}, ${JSON.stringify(collectionFile)});`);
    expect(result.code).toContain(`)(${JSON.stringify(subDir)}, ${JSON.stringify(folderFile)});`);
    expect(result.code).toContain(`)(${JSON.stringify(subDir)}, ${JSON.stringify(requestFile)});`);
  });

  test('preserves line counts when injecting IIFE args (opener stays on one line)', () => {
    const colDir = path.resolve('/col');
    const collectionFile = path.join(colDir, 'collection.bru');
    const requestFile = path.join(colDir, 'sub', 'req.bru');
    const withPaths = wrapAndJoinScripts(
      ['let x = 1;', '', 'let y = 2;'],
      2,
      {
        segmentSources: [{ filePath: collectionFile, displayPath: 'collection.bru' }, null, null],
        requestSegmentSource: { filePath: requestFile, displayPath: path.join('sub', 'req.bru') }
      }
    );
    const withoutPaths = wrapAndJoinScripts(['let x = 1;', '', 'let y = 2;'], 2);
    // Stack-trace mapping depends on line ranges staying stable.
    expect(withPaths.metadata.requestStartLine).toBe(withoutPaths.metadata.requestStartLine);
    expect(withPaths.metadata.requestEndLine).toBe(withoutPaths.metadata.requestEndLine);
  });

  test('falls back to collection dir for __dirname and leaves __filename undefined when a segment has no filePath', () => {
    const colDir = path.resolve('/col');
    const result = wrapAndJoinScripts(
      ['', '', 'console.log("hi");'],
      2,
      { collectionPath: colDir }
    );
    expect(result.code).toContain('async (__dirname, __filename) => {');
    expect(result.code).toContain(`)(${JSON.stringify(colDir)}, undefined);`);
  });

  test('binds both __dirname and __filename to undefined when neither filePath nor collectionPath is provided', () => {
    const result = wrapAndJoinScripts(['', '', 'console.log("hi");'], 2);
    expect(result.code).toContain('async (__dirname, __filename) => {');
    expect(result.code).toContain(')(undefined, undefined);');
  });
});

const makeCollection = (scripts = {}, pathname = '/test/collection') => ({
  pathname,
  format: 'bru',
  root: {
    request: {
      script: {
        req: scripts.preReq || '',
        res: scripts.postRes || ''
      },
      tests: scripts.tests || ''
    }
  }
});

const makeFolder = (name, scripts = {}, parentPath = '/test/collection') => ({
  type: 'folder',
  pathname: path.join(parentPath, name),
  root: {
    request: {
      script: {
        req: scripts.preReq || '',
        res: scripts.postRes || ''
      },
      tests: scripts.tests || ''
    }
  }
});

const makeRequest = (scripts = {}, pathname) => ({
  ...(pathname !== undefined ? { pathname } : {}),
  script: {
    req: scripts.preReq || '',
    res: scripts.postRes || ''
  },
  tests: scripts.tests || ''
});

describe('mergeScripts metadata', () => {
  test('produces null metadata when all scripts are empty', () => {
    const collection = makeCollection();
    const request = makeRequest();
    mergeScripts(collection, request, [request], 'sequential');
    expect(request.script.reqMetadata).toBeNull();
    expect(request.script.resMetadata).toBeNull();
    expect(request.testsMetadata).toBeNull();
  });

  test('produces metadata for request-only script', () => {
    const collection = makeCollection();
    const request = makeRequest({ preReq: 'console.log("req");' });
    mergeScripts(collection, request, [request], 'sequential');
    expect(request.script.reqMetadata).toEqual({
      requestStartLine: 1,
      requestEndLine: 3,
      requestScriptContent: 'console.log("req");'
    });
  });

  test('produces segments for collection + request scripts', () => {
    const collection = makeCollection({ preReq: 'let col = 1;' });
    const request = makeRequest({ preReq: 'let req = 2;' });
    mergeScripts(collection, request, [request], 'sequential');

    expect(request.script.reqMetadata.segments).toHaveLength(1);
    expect(request.script.reqMetadata.segments[0].displayPath).toBe('collection.bru');
    expect(request.script.reqMetadata.segments[0].filePath).toBe(
      path.join('/test/collection', 'collection.bru')
    );
    expect(request.script.reqMetadata.requestStartLine).toBeGreaterThan(
      request.script.reqMetadata.segments[0].endLine
    );
  });

  test('produces segments for collection + folder + request scripts', () => {
    const collection = makeCollection({ preReq: 'let col = 1;' });
    const folder = makeFolder('subfolder', { preReq: 'let fold = 2;' });
    const request = makeRequest({ preReq: 'let req = 3;' });
    mergeScripts(collection, request, [folder, request], 'sequential');

    expect(request.script.reqMetadata.segments).toHaveLength(2);
    expect(request.script.reqMetadata.segments[0].displayPath).toBe('collection.bru');
    // displayPath is posixified by mergeScripts regardless of platform
    expect(request.script.reqMetadata.segments[1].displayPath).toBe('subfolder/folder.bru');
  });

  test('non-sequential flow reverses post-res segment order', () => {
    const collection = makeCollection({ postRes: 'let col = 1;' });
    const folder = makeFolder('subfolder', { postRes: 'let fold = 2;' });
    const request = makeRequest({ postRes: 'let req = 3;' });
    mergeScripts(collection, request, [folder, request], 'non-sequential');

    // In non-sequential, request comes first, then folder (reversed), then collection
    expect(request.script.resMetadata.requestStartLine).toBe(1);
    const segments = request.script.resMetadata.segments;
    expect(segments).toHaveLength(2);
    // Folder should come before collection in reversed order
    expect(segments[0].displayPath).toBe('subfolder/folder.bru');
    expect(segments[1].displayPath).toBe('collection.bru');
  });

  test('handles tests metadata correctly', () => {
    const collection = makeCollection({ tests: 'test("col", () => {});' });
    const request = makeRequest({ tests: 'test("req", () => {});' });
    mergeScripts(collection, request, [request], 'sequential');

    expect(request.testsMetadata).toBeDefined();
    expect(request.testsMetadata.segments).toHaveLength(1);
    expect(request.testsMetadata.segments[0].displayPath).toBe('collection.bru');
    expect(request.testsMetadata.requestStartLine).toBeGreaterThan(0);
  });

  test('defaults to bru format when collection.format is not set', () => {
    const collection = makeCollection({ preReq: 'let x = 1;' });
    delete collection.format;
    const request = makeRequest({ preReq: 'let y = 2;' });
    mergeScripts(collection, request, [request], 'sequential');

    expect(request.script.reqMetadata.segments[0].displayPath).toBe('collection.bru');
  });

  test('includes requestScriptContent in metadata for pre-request scripts', () => {
    const collection = makeCollection({ preReq: 'let col = 1;' });
    const request = makeRequest({ preReq: 'let req = 2;' });
    mergeScripts(collection, request, [request], 'sequential');

    expect(request.script.reqMetadata.requestScriptContent).toBe('let req = 2;');
  });

  test('includes requestScriptContent in metadata for post-response scripts', () => {
    const collection = makeCollection({ postRes: 'let col = 1;' });
    const request = makeRequest({ postRes: 'let req = 2;' });
    mergeScripts(collection, request, [request], 'sequential');

    expect(request.script.resMetadata.requestScriptContent).toBe('let req = 2;');
  });

  test('includes requestScriptContent in metadata for tests', () => {
    const collection = makeCollection({ tests: 'test("col", () => {});' });
    const request = makeRequest({ tests: 'test("req", () => {});' });
    mergeScripts(collection, request, [request], 'sequential');

    expect(request.testsMetadata.requestScriptContent).toBe('test("req", () => {});');
  });

  test('includes requestScriptContent as empty string when request script is empty', () => {
    const collection = makeCollection({ preReq: 'let col = 1;' });
    const request = makeRequest();
    mergeScripts(collection, request, [request], 'sequential');

    expect(request.script.reqMetadata.requestScriptContent).toBe('');
  });

  test('includes scriptContent in collection segment sources', () => {
    const collection = makeCollection({ preReq: 'let col = 1;' });
    const request = makeRequest({ preReq: 'let req = 2;' });
    mergeScripts(collection, request, [request], 'sequential');

    expect(request.script.reqMetadata.segments[0].scriptContent).toBe('let col = 1;');
  });

  test('includes scriptContent in folder segment sources', () => {
    const collection = makeCollection();
    const folder = makeFolder('subfolder', { preReq: 'let fold = 1;' });
    const request = makeRequest({ preReq: 'let req = 2;' });
    mergeScripts(collection, request, [folder, request], 'sequential');

    expect(request.script.reqMetadata.segments[0].scriptContent).toBe('let fold = 1;');
  });

  test('includes scriptContent for both collection and folder segments', () => {
    const collection = makeCollection({ preReq: 'let col = 1;' });
    const folder = makeFolder('subfolder', { preReq: 'let fold = 2;' });
    const request = makeRequest({ preReq: 'let req = 3;' });
    mergeScripts(collection, request, [folder, request], 'sequential');

    expect(request.script.reqMetadata.segments).toHaveLength(2);
    expect(request.script.reqMetadata.segments[0].scriptContent).toBe('let col = 1;');
    expect(request.script.reqMetadata.segments[1].scriptContent).toBe('let fold = 2;');
  });

  test('includes requestScriptContent in non-sequential post-response metadata', () => {
    const collection = makeCollection({ postRes: 'let col = 1;' });
    const request = makeRequest({ postRes: 'let req = 2;' });
    mergeScripts(collection, request, [request], 'non-sequential');

    expect(request.script.resMetadata.requestScriptContent).toBe('let req = 2;');
  });

  test('injects hierarchical __dirname/__filename per script segment', () => {
    const collectionDir = path.resolve('/test/collection');
    const folderDir = path.join(collectionDir, 'subfolder');
    const requestFile = path.join(folderDir, 'req.bru');
    const collection = { ...makeCollection({ preReq: 'let col = 1;' }), pathname: collectionDir };
    const folder = { ...makeFolder('subfolder', { preReq: 'let fold = 2;' }), pathname: folderDir };
    const request = { ...makeRequest({ preReq: 'let req = 3;' }), pathname: requestFile };
    mergeScripts(collection, request, [folder, request], 'sequential');

    const code = request.script.req;
    const collectionFile = path.join(collectionDir, 'collection.bru');
    const folderFile = path.join(folderDir, 'folder.bru');

    expect(code).toContain(`)(${JSON.stringify(collectionDir)}, ${JSON.stringify(collectionFile)});`);
    expect(code).toContain(`)(${JSON.stringify(folderDir)}, ${JSON.stringify(folderFile)});`);
    expect(code).toContain(`)(${JSON.stringify(folderDir)}, ${JSON.stringify(requestFile)});`);
  });

  test('falls back to collection dir for __dirname and leaves __filename undefined when request has no pathname', () => {
    const collection = makeCollection();
    const request = makeRequest({ preReq: 'let req = 1;' });
    mergeScripts(collection, request, [request], 'sequential');

    const collectionDir = '/test/collection';
    expect(request.script.req).toContain(`)(${JSON.stringify(collectionDir)}, undefined);`);
  });
});

describe('mergeScripts and runScriptInNodeVm integration', () => {
  const setVar = (name) => `bru.setVar('${name}_dir', __dirname); bru.setVar('${name}_file', __filename);`;

  const run = async (mergedScript, collectionPath, scriptPath) => {
    const bru = { setVar: jest.fn() };
    // Stubs the __bruSetScope call the wrapped IIFE emits; tests don't assert on it.
    const context = { bru, console, __bruSetScope: jest.fn() };
    await runScriptInNodeVm({
      script: mergedScript,
      context,
      collectionPath,
      scriptingConfig: {},
      scriptPath
    });
    return bru;
  };

  test('collection, folder, and request pre-request scripts each see their own __dirname/__filename', async () => {
    const collectionPath = path.resolve('/test/collection');
    const folderPath = path.join(collectionPath, 'subfolder');
    const requestPath = path.join(folderPath, 'req.bru');

    const collection = makeCollection({ preReq: setVar('col') }, collectionPath);
    const folder = makeFolder('subfolder', { preReq: setVar('folder') }, collectionPath);
    const request = makeRequest({ preReq: setVar('req') }, requestPath);

    mergeScripts(collection, request, [folder, request], 'sequential');
    const bru = await run(request.script.req, collectionPath, requestPath);

    expect(bru.setVar).toHaveBeenCalledWith('col_dir', collectionPath);
    expect(bru.setVar).toHaveBeenCalledWith('col_file', path.join(collectionPath, 'collection.bru'));
    expect(bru.setVar).toHaveBeenCalledWith('folder_dir', folderPath);
    expect(bru.setVar).toHaveBeenCalledWith('folder_file', path.join(folderPath, 'folder.bru'));
    expect(bru.setVar).toHaveBeenCalledWith('req_dir', folderPath);
    expect(bru.setVar).toHaveBeenCalledWith('req_file', requestPath);
  });

  test('request script can read a file relative to __dirname', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-dirname-'));
    try {
      const folderPath = path.join(tmpRoot, 'subfolder');
      fs.mkdirSync(folderPath);
      const requestPath = path.join(folderPath, 'read.bru');
      fs.writeFileSync(path.join(folderPath, 'data.json'), '{"hello":"world"}');

      const script = `
        const fs = require('fs');
        const path = require('path');
        const contents = fs.readFileSync(path.join(__dirname, 'data.json'), 'utf-8');
        bru.setVar('data', contents);
      `;

      const collection = makeCollection({}, tmpRoot);
      const folder = makeFolder('subfolder', {}, tmpRoot);
      const request = makeRequest({ preReq: script }, requestPath);

      mergeScripts(collection, request, [folder, request], 'sequential');
      const bru = await run(request.script.req, tmpRoot, requestPath);

      expect(bru.setVar).toHaveBeenCalledWith('data', '{"hello":"world"}');
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  test('falls back to collection dir when request has no pathname', async () => {
    const collectionPath = path.resolve('/test/collection');
    const collection = makeCollection({}, collectionPath);
    const request = makeRequest({ preReq: setVar('req') });

    mergeScripts(collection, request, [request], 'sequential');
    expect(request.script.req).toContain(`)(${JSON.stringify(collectionPath)}, undefined);`);

    const bru = await run(request.script.req, collectionPath, undefined);

    expect(bru.setVar).toHaveBeenCalledWith('req_dir', collectionPath);
    expect(bru.setVar).toHaveBeenCalledWith('req_file', undefined);
  });

  test('post-response and tests scripts also receive per-segment __dirname/__filename', async () => {
    const collectionPath = path.resolve('/test/collection');
    const folderPath = path.join(collectionPath, 'subfolder');
    const requestPath = path.join(folderPath, 'req.bru');

    const collection = makeCollection(
      { postRes: setVar('col_post'), tests: setVar('col_test') },
      collectionPath
    );
    const folder = makeFolder(
      'subfolder',
      { postRes: setVar('folder_post'), tests: setVar('folder_test') },
      collectionPath
    );
    const request = makeRequest(
      { postRes: setVar('req_post'), tests: setVar('req_test') },
      requestPath
    );

    mergeScripts(collection, request, [folder, request], 'sequential');

    const postBru = await run(request.script.res, collectionPath, requestPath);
    expect(postBru.setVar).toHaveBeenCalledWith('col_post_dir', collectionPath);
    expect(postBru.setVar).toHaveBeenCalledWith('folder_post_dir', folderPath);
    expect(postBru.setVar).toHaveBeenCalledWith('req_post_dir', folderPath);
    expect(postBru.setVar).toHaveBeenCalledWith('req_post_file', requestPath);

    const testsBru = await run(request.tests, collectionPath, requestPath);
    expect(testsBru.setVar).toHaveBeenCalledWith('col_test_dir', collectionPath);
    expect(testsBru.setVar).toHaveBeenCalledWith('folder_test_dir', folderPath);
    expect(testsBru.setVar).toHaveBeenCalledWith('req_test_dir', folderPath);
    expect(testsBru.setVar).toHaveBeenCalledWith('req_test_file', requestPath);
  });
});
