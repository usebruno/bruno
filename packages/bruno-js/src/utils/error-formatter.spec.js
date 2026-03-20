const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const {
  formatErrorWithContext,
  formatErrorWithContextV2,
  findScriptBlockStartLine,
  findScriptBlockEndLine,
  findYmlScriptBlockStartLine,
  findYmlScriptBlockEndLine,
  adjustLineNumber,
  parseStackTrace,
  parseErrorLocation,
  getSourceContextFromContent,
  adjustStackTrace,
  buildStackFromCallSites
} = require('./error-formatter');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Line numbers annotated for reference:
// 13: script:pre-request {        → blockStartLine = 14
// 14:   const token = ...          → script line 1
// 18: script:post-response {      → blockStartLine = 19
// 19:   const data = res.body;     → script line 1
// 20:   bru.setVar(...)            → script line 2
// 24: tests {                     → blockStartLine = 25
// 25:   test("status is 200"...)   → script line 1
const MULTI_BLOCK_BRU = `meta {
  name: multi-block-test
  type: http
  seq: 1
}

get {
  url: https://example.com
  body: none
  auth: none
}

script:pre-request {
  const token = bru.getEnvVar('token');
  req.setHeader('Authorization', token);
}

script:post-response {
  const data = res.body;
  bru.setVar('userId', data.id);
  console.log(data);
}

tests {
  test("status is 200", function() {
    expect(res.status).to.equal(200);
  });
  test("has body", function() {
    expect(res.body).to.not.be.null;
  });
}`;

// Fixture with JS comments to verify line mapping when comments are present.
// 11: script:post-response {      → blockStartLine = 12
// 12:   // This is a comment       → script line 1
// 13:   const data = res.body;     → script line 2
// 14:   // Another comment         → script line 3
// 15:   bru.setVar('userId', ...); → script line 4
const BRU_WITH_COMMENTS = `meta {
  name: comment-test
  type: http
  seq: 1
}

get {
  url: https://example.com
}

script:post-response {
  // This is a comment
  const data = res.body;
  // Another comment
  bru.setVar('userId', data.id);
}`;

// YML fixture: blockStartLine = 8 (pre-request), 12 (post-response), 16 (tests)
const MULTI_BLOCK_YML = [
  'info:',
  '  name: yaml-test',
  '  version: "1"',
  'runtime:',
  '  scripts:',
  '    - type: before-request',
  '      code: |-',
  '        const token = bru.getEnvVar(\'token\');',
  '        req.setHeader(\'Authorization\', token);',
  '    - type: after-response',
  '      code: |-',
  '        const data = res.body;',
  '        bru.setVar(\'userId\', data.id);',
  '    - type: tests',
  '      code: |-',
  '        test("status is 200", function() {',
  '          expect(res.status).to.equal(200);',
  '        });'
].join('\n');

// Collection/folder yml : scripts at request.scripts
// blockStartLine: before-request = 5, tests = 9
const COLLECTION_YML = [
  'info:',
  '  name: test-collection',
  'request:',
  '  scripts:',
  '    - type: before-request',
  '      code: |-',
  '        const abc = fc()',
  '        const x = bru.getVar(\'x\');',
  '    - type: tests',
  '      code: |-',
  '        test("example", function() {',
  '          expect(true).to.be.true;',
  '        });'
].join('\n');

// Wrapper offsets: QuickJS = 9 (script line 1 = VM line 10), NodeVM = 2 (script line 1 = VM line 3)

describe('Error Formatter', () => {
  let testDir;
  let bruFilePath;
  let ymlFilePath;
  let bruWithCommentsPath;
  let collectionYmlPath;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-test-'));
    bruFilePath = path.join(testDir, 'test.bru');
    ymlFilePath = path.join(testDir, 'test.yml');
    bruWithCommentsPath = path.join(testDir, 'comments.bru');
    collectionYmlPath = path.join(testDir, 'opencollection.yml');
    fs.writeFileSync(bruFilePath, MULTI_BLOCK_BRU);
    fs.writeFileSync(ymlFilePath, MULTI_BLOCK_YML);
    fs.writeFileSync(bruWithCommentsPath, BRU_WITH_COMMENTS);
    fs.writeFileSync(collectionYmlPath, COLLECTION_YML);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('findScriptBlockStartLine', () => {
    it('should find each block type in .bru files', () => {
      expect(findScriptBlockStartLine(bruFilePath, 'pre-request')).toBe(14);
      expect(findScriptBlockStartLine(bruFilePath, 'post-response')).toBe(19);
      expect(findScriptBlockStartLine(bruFilePath, 'test')).toBe(25);
    });

    it('should return null for missing block or non-.bru files', () => {
      const noBlockPath = path.join(testDir, 'no-block.bru');
      fs.writeFileSync(noBlockPath, 'meta {\n  name: test\n}');
      expect(findScriptBlockStartLine(noBlockPath, 'post-response')).toBeNull();
      expect(findScriptBlockStartLine('/some/file.js', 'post-response')).toBeNull();
    });
  });

  describe('findScriptBlockEndLine', () => {
    it('should find last content line for each block type', () => {
      expect(findScriptBlockEndLine(bruFilePath, 'pre-request')).toBe(15);
      expect(findScriptBlockEndLine(bruFilePath, 'post-response')).toBe(21);
      expect(findScriptBlockEndLine(bruFilePath, 'test')).toBe(30);
    });

    it('should return null for empty block', () => {
      const emptyBlockPath = path.join(testDir, 'empty.bru');
      fs.writeFileSync(emptyBlockPath, 'script:pre-request {\n}');
      expect(findScriptBlockEndLine(emptyBlockPath, 'pre-request')).toBeNull();
    });

    it('should return null for missing block', () => {
      const noBlockPath = path.join(testDir, 'no-block.bru');
      fs.writeFileSync(noBlockPath, 'meta {\n  name: test\n}');
      expect(findScriptBlockEndLine(noBlockPath, 'pre-request')).toBeNull();
    });

    it('should return null for non-.bru files', () => {
      expect(findScriptBlockEndLine('/some/file.js', 'pre-request')).toBeNull();
      expect(findScriptBlockEndLine(ymlFilePath, 'pre-request')).toBeNull();
    });
  });

  describe('findYmlScriptBlockStartLine', () => {
    it('should find each block type in .yml files', () => {
      expect(findYmlScriptBlockStartLine(ymlFilePath, 'pre-request')).toBe(8);
      expect(findYmlScriptBlockStartLine(ymlFilePath, 'post-response')).toBe(12);
      expect(findYmlScriptBlockStartLine(ymlFilePath, 'test')).toBe(16);
    });

    it('should find script blocks in collection/folder yml files (request.scripts path)', () => {
      expect(findYmlScriptBlockStartLine(collectionYmlPath, 'pre-request')).toBe(7);
      expect(findYmlScriptBlockStartLine(collectionYmlPath, 'test')).toBe(11);
    });

    it('should return null for missing block or non-.yml files', () => {
      const noRuntimePath = path.join(testDir, 'no-runtime.yml');
      fs.writeFileSync(noRuntimePath, 'info:\n  name: simple\n  version: "1"\n');
      expect(findYmlScriptBlockStartLine(noRuntimePath, 'pre-request')).toBeNull();
    });
  });

  describe('findYmlScriptBlockEndLine', () => {
    it('should find last content line for each block type in runtime.scripts', () => {
      expect(findYmlScriptBlockEndLine(ymlFilePath, 'pre-request')).toBe(9);
      expect(findYmlScriptBlockEndLine(ymlFilePath, 'post-response')).toBe(13);
      expect(findYmlScriptBlockEndLine(ymlFilePath, 'test')).toBe(18);
    });

    it('should find last content line in collection yml (request.scripts)', () => {
      expect(findYmlScriptBlockEndLine(collectionYmlPath, 'pre-request')).toBe(8);
      expect(findYmlScriptBlockEndLine(collectionYmlPath, 'test')).toBe(13);
    });

    it('should return null for missing block', () => {
      const noRuntimePath = path.join(testDir, 'no-runtime.yml');
      fs.writeFileSync(noRuntimePath, 'info:\n  name: simple\n  version: "1"\n');
      expect(findYmlScriptBlockEndLine(noRuntimePath, 'pre-request')).toBeNull();
    });

    it('should return null for non-.yml files', () => {
      expect(findYmlScriptBlockEndLine('/some/file.js', 'pre-request')).toBeNull();
      expect(findYmlScriptBlockEndLine(bruFilePath, 'pre-request')).toBeNull();
    });

    it('should return null for invalid YAML', () => {
      const invalidYmlPath = path.join(testDir, 'invalid.yml');
      fs.writeFileSync(invalidYmlPath, ':\n  - :\n    bad: [unclosed');
      expect(findYmlScriptBlockEndLine(invalidYmlPath, 'pre-request')).toBeNull();
    });
  });

  describe('adjustLineNumber', () => {
    it('should adjust QuickJS lines for .bru files', () => {
      // VM line - offset(9) = scriptLine → blockStart + scriptLine - 1
      expect(adjustLineNumber(bruFilePath, 10, true, 'pre-request')).toBe(14);
      expect(adjustLineNumber(bruFilePath, 11, true, 'post-response')).toBe(20);
      expect(adjustLineNumber(bruFilePath, 10, true, 'test')).toBe(25);
    });

    it('should adjust NodeVM lines for .bru files', () => {
      // VM line 4 - offset(2) = scriptLine 2 → blockStart(19) + 2 - 1 = 20
      expect(adjustLineNumber(bruFilePath, 4, false, 'post-response')).toBe(20);
    });

    it('should adjust lines for .yml files', () => {
      expect(adjustLineNumber(ymlFilePath, 10, true, 'pre-request')).toBe(8);
      expect(adjustLineNumber(ymlFilePath, 11, true, 'post-response')).toBe(13);
      expect(adjustLineNumber(ymlFilePath, 4, false, 'post-response')).toBe(13);
    });

    it('should adjust lines correctly when script has comments', () => {
      // VM line 12 - offset(9) = scriptLine 3 → blockStart(12) + 3 - 1 = 14
      expect(adjustLineNumber(bruWithCommentsPath, 12, true, 'post-response')).toBe(14);
    });

    it('should return reportedLine for non-.bru/.yml files or invalid offset', () => {
      expect(adjustLineNumber('/some/file.js', 10, true, 'post-response')).toBe(10);
      // VM line 5 - offset(9) = -4, which is < 1
      expect(adjustLineNumber(bruFilePath, 5, true, 'post-response')).toBe(5);
    });

    it('should use metadata for combined scripts', () => {
      // scriptLine 5 within request range [5, 7] → blockStart(19) + (5-5) - 1 = 18
      const metadata = { requestStartLine: 5, requestEndLine: 7 };
      expect(adjustLineNumber(bruFilePath, 14, true, 'post-response', null, metadata)).toBe(18);
    });

    it('should return null for collection/folder segment errors', () => {
      // scriptLine 3 is before requestStartLine(10) → cannot map to request file
      const metadata = { requestStartLine: 10, requestEndLine: 15 };
      expect(adjustLineNumber(bruFilePath, 12, true, 'post-response', null, metadata)).toBeNull();
    });

    it('should return null when request segment is empty', () => {
      // requestStartLine: 0 indicates the request segment was empty
      const metadata = { requestStartLine: 0, requestEndLine: 0 };
      expect(adjustLineNumber(bruFilePath, 12, true, 'post-response', null, metadata)).toBeNull();
    });
  });

  describe('parseStackTrace', () => {
    it('should detect QuickJS stack frame formats', () => {
      expect(parseStackTrace('Error: test\n    at (/path/file.bru:11)'))
        .toMatchObject({ filePath: '/path/file.bru', line: 11, isQuickJS: true });
      expect(parseStackTrace('Error: test\n    at <anonymous> (/path/file.bru:11)'))
        .toMatchObject({ filePath: '/path/file.bru', line: 11, isQuickJS: true });
      expect(parseStackTrace('Error: test\n    at <eval> (/path/file.bru:11:5)'))
        .toMatchObject({ filePath: '/path/file.bru', line: 11, column: 5, isQuickJS: true });
    });

    it('should detect NodeVM stack frame formats', () => {
      expect(parseStackTrace('Error: test\n    at /path/file.js:10:5'))
        .toMatchObject({ filePath: '/path/file.js', line: 10, column: 5, isQuickJS: false });
      expect(parseStackTrace('Error: test\n    at Object.<anonymous> (/path/file.js:10:5)'))
        .toMatchObject({ filePath: '/path/file.js', line: 10, column: 5, isQuickJS: false });
    });

    it('should return null for unparseable or null input', () => {
      expect(parseStackTrace('just a plain string')).toBeNull();
      expect(parseStackTrace(null)).toBeNull();
    });
  });

  describe('formatErrorWithContext', () => {
    it('should format error with arrow pointing at the correct line', () => {
      const error = new Error('data is not defined');
      error.name = 'ReferenceError';
      error.stack = `ReferenceError: data is not defined\n    at (${bruFilePath}:10)`;

      const formatted = formatErrorWithContext(error, 'test.bru', 'post-response');
      expect(formatted).toContain('ReferenceError: data is not defined');

      const arrowLine = formatted.split('\n').find((l) => l.startsWith('>'));
      expect(arrowLine).toContain('const data = res.body;');
    });

    it('should show original error type for wrapped QuickJS errors', () => {
      const error = new Error('x is not defined');
      error.name = 'QuickJSUnwrapError';
      error.cause = { name: 'ReferenceError', message: 'x is not defined' };
      error.stack = `QuickJSUnwrapError: x is not defined\n    at (${bruFilePath}:10)`;

      const formatted = formatErrorWithContext(error, 'test.bru', 'post-response');
      expect(formatted).toContain('ReferenceError:');
      expect(formatted).not.toContain('QuickJSUnwrapError');
    });

    it('should use __callSites and adjust line numbers in stack', () => {
      const error = new Error('data is not defined');
      error.name = 'ReferenceError';
      error.stack = `ReferenceError: data is not defined\n    at ${bruFilePath}:4:5`;
      error.__callSites = [{ filePath: bruFilePath, line: 4, column: 5, functionName: null }];

      const formatted = formatErrorWithContext(error, 'test.bru', 'post-response');
      // VM line 4 → file line 20
      expect(formatted).toContain(`${bruFilePath}:20:5`);

      const arrowLine = formatted.split('\n').find((l) => l.startsWith('>'));
      expect(arrowLine).toContain('bru.setVar');
    });

    it('should show message-only output for collection/folder script errors', () => {
      const error = new Error('x is not defined');
      error.name = 'ReferenceError';
      // scriptLine 3 (VM 12 - offset 9) is before requestStartLine(10)
      error.stack = `ReferenceError: x is not defined\n    at (${bruFilePath}:12)`;

      const metadata = { requestStartLine: 10, requestEndLine: 15 };
      const formatted = formatErrorWithContext(error, 'test.bru', 'post-response', 5, metadata);

      expect(formatted).toContain('ReferenceError: x is not defined');
      // Should NOT show source context from the request file
      expect(formatted).not.toContain('File:');
      expect(formatted).not.toContain('meta {');
      expect(formatted).not.toContain('>');
    });

    it('should show source context from collection.bru when segments are provided', () => {
      const collectionBruPath = path.join(testDir, 'collection.bru');
      fs.writeFileSync(collectionBruPath, 'meta {\n  name: My Collection\n}\n\nscript:pre-request {\n  const x = undefined;\n  x.foo();\n}');

      const error = new Error('Cannot read properties of undefined');
      error.name = 'TypeError';
      // NodeVM offset=2, scriptRelativeLine = 5-2 = 3 → line 3 of wrapped segment = x.foo()
      error.stack = `TypeError: Cannot read properties of undefined\n    at ${bruFilePath}:5:5`;

      // Collection segment is lines 1-4 in combined script (3-line wrap of 2-line script)
      const metadata = {
        requestStartLine: 0,
        requestEndLine: 0,
        segments: [
          { startLine: 1, endLine: 4, filePath: collectionBruPath, displayPath: 'collection.bru' }
        ]
      };

      const formatted = formatErrorWithContext(error, 'test.bru', 'pre-request', 5, metadata);
      expect(formatted).toContain('File: collection.bru');
      expect(formatted).toContain('x.foo()');
      expect(formatted).toContain('TypeError: Cannot read properties of undefined');
      const arrowLine = formatted.split('\n').find((l) => l.startsWith('>'));
      expect(arrowLine).toContain('x.foo()');
    });

    it('should resolve error to correct folder when multiple segments exist', () => {
      const folder1Dir = path.join(testDir, 'folder1');
      const folder2Dir = path.join(testDir, 'folder2');
      fs.mkdirSync(folder1Dir);
      fs.mkdirSync(folder2Dir);

      const folder1Bru = path.join(folder1Dir, 'folder.bru');
      const folder2Bru = path.join(folder2Dir, 'folder.bru');
      fs.writeFileSync(folder1Bru, 'meta {\n  name: Folder1\n}\n\nscript:pre-request {\n  let a = 1;\n}');
      fs.writeFileSync(folder2Bru, 'meta {\n  name: Folder2\n}\n\nscript:pre-request {\n  let b = undefined;\n  b.pop();\n}');

      const error = new Error('Cannot read properties of undefined');
      error.name = 'TypeError';
      // NodeVM offset=2, scriptRelativeLine = 9-2 = 7, falls in folder2 segment [5,7]
      error.stack = `TypeError: Cannot read properties of undefined\n    at ${bruFilePath}:9:5`;

      const metadata = {
        requestStartLine: 0,
        requestEndLine: 0,
        segments: [
          { startLine: 1, endLine: 3, filePath: folder1Bru, displayPath: 'folder1/folder.bru' },
          { startLine: 5, endLine: 7, filePath: folder2Bru, displayPath: 'folder2/folder.bru' }
        ]
      };

      const formatted = formatErrorWithContext(error, 'test.bru', 'pre-request', 5, metadata);
      expect(formatted).toContain('File: folder2/folder.bru');
      expect(formatted).toContain('b.pop()');
    });

    it('should resolve collection yml segment errors to opencollection.yml', () => {
      const error = new Error('\'fc\' is not defined');
      error.name = 'ReferenceError';
      error.__isQuickJS = true;
      // QuickJS offset=9, scriptRelativeLine = 11-9 = 2 → falls in collection segment [1,4]
      error.stack = `ReferenceError: 'fc' is not defined\n    at <anonymous> (${ymlFilePath}:11)`;

      const metadata = {
        requestStartLine: 6,
        requestEndLine: 8,
        segments: [
          { startLine: 1, endLine: 4, filePath: collectionYmlPath, displayPath: 'opencollection.yml' }
        ]
      };

      const formatted = formatErrorWithContext(error, 'test.yml', 'pre-request', 5, metadata);
      expect(formatted).toContain('File: opencollection.yml');
      expect(formatted).toContain('\'fc\' is not defined');
      const arrowLine = formatted.split('\n').find((l) => l.startsWith('>'));
      expect(arrowLine).toContain('fc()');
    });

    it('should handle edge cases gracefully', () => {
      expect(formatErrorWithContext(null)).toBe('');

      const error = new Error('Test error');
      error.stack = 'Invalid stack trace';
      expect(formatErrorWithContext(error)).toContain('Test error');
    });
  });

  describe('formatErrorWithContextV2', () => {
    const makeCallSiteError = (filePath, line, message = 'test error', name = 'Error') => {
      const error = new Error(message);
      error.name = name;
      error.__callSites = [{ filePath, line, column: 1 }];
      error.stack = `${name}: ${message}\n    at Object.<anonymous> (${filePath}:${line}:1)`;
      return error;
    };

    const makeQuickJSError = (filePath, line, message = 'test error', name = 'Error') => {
      const error = new Error(message);
      error.name = name;
      error.__isQuickJS = true;
      error.stack = `${name}: ${message}\n    at <anonymous> (${filePath}:${line})`;
      return error;
    };

    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    describe('null/falsy error input', () => {
      it('should return null for null error', () => {
        expect(formatErrorWithContextV2(null, 'pre-request')).toBeNull();
      });

      it('should return null for undefined error', () => {
        expect(formatErrorWithContextV2(undefined, 'pre-request')).toBeNull();
      });

      it('should return null for error without parseable location', () => {
        const error = new Error('no location');
        error.stack = '';
        expect(formatErrorWithContextV2(error, 'pre-request')).toBeNull();
      });
    });

    describe('.bru file errors', () => {
      it('should produce correct block-relative line numbers for pre-request (NodeVM)', () => {
        const error = makeCallSiteError(bruFilePath, 3, 'token is not defined', 'ReferenceError');
        const result = formatErrorWithContextV2(error, 'pre-request', null, testDir);

        expect(result).not.toBeNull();
        expect(result.errorType).toBe('ReferenceError');
        expect(result.errorLine).toBe(1);
        expect(result.filePath).toBe('test.bru');
        expect(result.lines.length).toBeGreaterThan(0);
        expect(result.lines.every((l) => l.lineNumber >= 1)).toBe(true);
      });

      it('should produce correct block-relative line numbers for post-response (NodeVM)', () => {
        const error = makeCallSiteError(bruFilePath, 4, 'data is not defined', 'ReferenceError');
        const result = formatErrorWithContextV2(error, 'post-response', null, testDir);

        expect(result).not.toBeNull();
        expect(result.errorLine).toBe(2);
        expect(result.filePath).toBe('test.bru');
      });

      it('should produce correct block-relative line numbers for tests (NodeVM)', () => {
        const error = makeCallSiteError(bruFilePath, 3, 'assertion failed');
        const result = formatErrorWithContextV2(error, 'test', null, testDir);

        expect(result).not.toBeNull();
        expect(result.errorLine).toBe(1);
      });

      it('should handle QuickJS errors with correct offset', () => {
        const error = makeQuickJSError(bruFilePath, 10, 'data is not defined', 'ReferenceError');
        const result = formatErrorWithContextV2(error, 'post-response', null, testDir);

        expect(result).not.toBeNull();
        expect(result.errorLine).toBe(1);
        expect(result.errorType).toBe('ReferenceError');
      });
    });

    describe('.yml file errors', () => {
      it('should produce correct block-relative line numbers for pre-request (NodeVM)', () => {
        const error = makeCallSiteError(ymlFilePath, 3, 'token error');
        const result = formatErrorWithContextV2(error, 'pre-request', null, testDir);

        expect(result).not.toBeNull();
        expect(result.errorLine).toBe(1);
        expect(result.filePath).toBe('test.yml');
      });

      it('should produce correct block-relative line numbers for post-response (NodeVM)', () => {
        const error = makeCallSiteError(ymlFilePath, 3, 'data error');
        const result = formatErrorWithContextV2(error, 'post-response', null, testDir);

        expect(result).not.toBeNull();
        expect(result.errorLine).toBe(1);
      });

      it('should return null when yml script block has empty code', () => {
        const emptyYml = [
          'info:',
          '  name: empty-test',
          '  version: "1"',
          'runtime:',
          '  scripts:',
          '    - type: before-request',
          '      code: ""'
        ].join('\n');
        const emptyYmlPath = path.join(testDir, 'empty.yml');
        fs.writeFileSync(emptyYmlPath, emptyYml);

        const error = makeCallSiteError(emptyYmlPath, 3, 'error');
        const result = formatErrorWithContextV2(error, 'pre-request', null, testDir);

        expect(result).toBeNull();
      });
    });

    describe('segment resolution (collection/folder scripts)', () => {
      it('should resolve errors in collection script segments', () => {
        const metadata = {
          requestStartLine: 5,
          requestEndLine: 8,
          segments: [{
            startLine: 1,
            endLine: 4,
            filePath: collectionYmlPath
          }]
        };

        const error = makeCallSiteError(bruFilePath, 4, 'x is not defined', 'ReferenceError');
        const result = formatErrorWithContextV2(error, 'pre-request', metadata, testDir);

        expect(result).not.toBeNull();
        expect(result.filePath).toBe('opencollection.yml');
        expect(result.errorLine).toBe(1);
      });

      it('should return null when segment resolution fails', () => {
        const metadata = {
          requestStartLine: 5,
          requestEndLine: 8,
          segments: []
        };

        const error = makeCallSiteError(bruFilePath, 3, 'error');
        const result = formatErrorWithContextV2(error, 'pre-request', metadata, testDir);

        expect(result).toBeNull();
      });
    });

    describe('stack trace extraction', () => {
      it('should extract only "at" frames with indentation', () => {
        const error = makeCallSiteError(bruFilePath, 3, 'test error', 'Error');
        const result = formatErrorWithContextV2(error, 'pre-request', null, testDir);

        expect(result).not.toBeNull();
        if (result.stack) {
          const lines = result.stack.split('\n');
          lines.forEach((line) => {
            expect(line).toMatch(/^\s+at /);
          });
        }
      });

      it('should return stack as null when error has no stack', () => {
        const error = makeCallSiteError(bruFilePath, 3, 'test error');
        delete error.stack;
        const result = formatErrorWithContextV2(error, 'pre-request', null, testDir);

        expect(result).not.toBeNull();
        expect(result.stack).toBeNull();
      });

      it('should return stack as null when stack has no "at" frames', () => {
        const error = makeCallSiteError(bruFilePath, 3, 'test error');
        error.stack = 'Error: test error\nsome other info';
        const result = formatErrorWithContextV2(error, 'pre-request', null, testDir);

        expect(result).not.toBeNull();
        expect(result.stack).toBeNull();
      });
    });

    describe('context lines filtering', () => {
      it('should filter lines to block boundaries', () => {
        const error = makeCallSiteError(bruFilePath, 3, 'error');
        const result = formatErrorWithContextV2(error, 'pre-request', null, testDir);

        expect(result).not.toBeNull();
        result.lines.forEach((l) => {
          expect(l.lineNumber).toBeGreaterThanOrEqual(1);
        });
      });

      it('should mark the error line correctly', () => {
        const error = makeCallSiteError(bruFilePath, 3, 'error');
        const result = formatErrorWithContextV2(error, 'pre-request', null, testDir);

        expect(result).not.toBeNull();
        const errorLines = result.lines.filter((l) => l.isError);
        expect(errorLines.length).toBe(1);
        expect(errorLines[0].lineNumber).toBe(result.errorLine);
      });

      it('should return null when all context lines are filtered out', () => {
        const emptyBru = `meta {
  name: empty-test
  type: http
  seq: 1
}

script:pre-request {
}`;
        const emptyBruPath = path.join(testDir, 'empty.bru');
        fs.writeFileSync(emptyBruPath, emptyBru);

        const error = makeCallSiteError(emptyBruPath, 3, 'error');
        const result = formatErrorWithContextV2(error, 'pre-request', null, testDir);

        expect(result).toBeNull();
      });

      it('should return null when .bru file has no script block at all', () => {
        const noScriptBru = `meta {
  name: no-script-test
  type: http
  seq: 1
}

get {
  url: https://example.com
}`;
        const noScriptBruPath = path.join(testDir, 'no-script.bru');
        fs.writeFileSync(noScriptBruPath, noScriptBru);

        const error = makeCallSiteError(noScriptBruPath, 3, 'error');
        const result = formatErrorWithContextV2(error, 'pre-request', null, testDir);

        expect(result).toBeNull();
      });

      it('should return null when .yml file has no script section at all', () => {
        const noScriptYml = [
          'info:',
          '  name: no-script-test',
          '  version: "1"',
          'runtime:',
          '  settings:',
          '    timeout: 5000'
        ].join('\n');
        const noScriptYmlPath = path.join(testDir, 'no-script.yml');
        fs.writeFileSync(noScriptYmlPath, noScriptYml);

        const error = makeCallSiteError(noScriptYmlPath, 3, 'error');
        const result = formatErrorWithContextV2(error, 'pre-request', null, testDir);

        expect(result).toBeNull();
      });
    });

    describe('external JS file errors (no block offset)', () => {
      it('should use absolute line numbers for non-.bru/.yml files', () => {
        const jsFilePath = path.join(testDir, 'helper.js');
        fs.writeFileSync(jsFilePath, 'function foo() {\n  throw new Error("oops");\n}\nfoo();\n');

        const error = makeCallSiteError(jsFilePath, 2, 'oops');
        const result = formatErrorWithContextV2(error, 'pre-request', null, testDir);

        expect(result).not.toBeNull();
        expect(result.errorLine).toBe(2);
        expect(result.filePath).toBe('helper.js');
      });
    });

    describe('scriptMetadata precedence', () => {
      it('should prefer error.scriptMetadata over parameter when non-empty', () => {
        const errorMetadata = {
          requestStartLine: 1,
          requestEndLine: 2
        };
        const paramMetadata = {
          requestStartLine: 10,
          requestEndLine: 20
        };

        const error = makeCallSiteError(bruFilePath, 3, 'error');
        error.scriptMetadata = errorMetadata;
        const result = formatErrorWithContextV2(error, 'pre-request', paramMetadata, testDir);

        expect(result).not.toBeNull();
      });

      it('should fall back to parameter when error.scriptMetadata is empty object', () => {
        const paramMetadata = {
          requestStartLine: 1,
          requestEndLine: 2
        };

        const error = makeCallSiteError(bruFilePath, 3, 'error');
        error.scriptMetadata = {};
        const result = formatErrorWithContextV2(error, 'pre-request', paramMetadata, testDir);

        expect(result).not.toBeNull();
      });

      it('should fall back to parameter when error.scriptMetadata is null', () => {
        const paramMetadata = {
          requestStartLine: 1,
          requestEndLine: 2
        };

        const error = makeCallSiteError(bruFilePath, 3, 'error');
        error.scriptMetadata = null;
        const result = formatErrorWithContextV2(error, 'pre-request', paramMetadata, testDir);

        expect(result).not.toBeNull();
      });
    });

    describe('error type extraction', () => {
      it('should extract error type from error.name', () => {
        const error = makeCallSiteError(bruFilePath, 3, 'x is not defined', 'ReferenceError');
        const result = formatErrorWithContextV2(error, 'pre-request', null, testDir);

        expect(result).not.toBeNull();
        expect(result.errorType).toBe('ReferenceError');
      });

      it('should extract error type from error.cause.name', () => {
        const error = makeCallSiteError(bruFilePath, 3, 'wrapped error');
        error.cause = { name: 'TypeError', message: 'original error' };
        const result = formatErrorWithContextV2(error, 'pre-request', null, testDir);

        expect(result).not.toBeNull();
        expect(result.errorType).toBe('TypeError');
      });
    });

    describe('display path', () => {
      it('should compute relative path from collectionPath', () => {
        const error = makeCallSiteError(bruFilePath, 3, 'error');
        const result = formatErrorWithContextV2(error, 'pre-request', null, testDir);

        expect(result).not.toBeNull();
        expect(result.filePath).toBe('test.bru');
      });

      it('should fall back to absolute filePath when collectionPath is undefined', () => {
        const error = makeCallSiteError(bruFilePath, 3, 'error');
        const result = formatErrorWithContextV2(error, 'pre-request');

        expect(result).not.toBeNull();
        expect(result.filePath).toBe(bruFilePath);
      });
    });

    describe('catch block logging', () => {
      it('should log a warning when an internal error occurs', () => {
        const error = new Error('test');
        error.__callSites = [{ filePath: bruFilePath, line: 3, column: 1 }];
        Object.defineProperty(error, 'name', {
          get() { throw new Error('property access bomb'); }
        });

        const result = formatErrorWithContextV2(error, 'pre-request', null, testDir);
        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalled();
      });
    });

    describe('in-memory script content (draft state)', () => {
      it('should use requestScriptContent for request-level errors instead of disk', () => {
        // The .bru file on disk has different content than the draft
        const draftContent = 'const draft = true;\ndraft.missing.prop;\nconsole.log("draft");';
        const metadata = {
          requestStartLine: 1,
          requestEndLine: 3,
          requestScriptContent: draftContent
        };

        // NodeVM: line 4 - offset 2 = scriptRelativeLine 2, within request range [1,3]
        // lineInScript = 2 - 1 = 1, which maps to first line of draft content
        const error = makeCallSiteError(bruFilePath, 4, 'draft.missing is not defined', 'ReferenceError');
        const result = formatErrorWithContextV2(error, 'pre-request', metadata, testDir);

        expect(result).not.toBeNull();
        expect(result.errorLine).toBe(1);
        expect(result.lines[0].content).toBe('const draft = true;');
        expect(result.lines[0].isError).toBe(true);
      });

      it('should show correct error line from draft content', () => {
        const draftContent = 'const a = 1;\nconst b = undefined;\nb.foo();';
        const metadata = {
          requestStartLine: 1,
          requestEndLine: 3,
          requestScriptContent: draftContent
        };

        // NodeVM: line 5 - offset 2 = scriptRelativeLine 3, within request range [1,3]
        // lineInScript = 3 - 1 = 2, which maps to second line of draft content
        const error = makeCallSiteError(bruFilePath, 5, 'b is undefined', 'TypeError');
        const result = formatErrorWithContextV2(error, 'pre-request', metadata, testDir);

        expect(result).not.toBeNull();
        expect(result.errorLine).toBe(2);
        const errorLine = result.lines.find((l) => l.isError);
        expect(errorLine.content).toBe('const b = undefined;');
      });

      it('should use scriptContent from segments for collection/folder errors', () => {
        const draftCollectionScript = 'const draftCol = true;\ndraftCol.missing.prop;';
        const metadata = {
          requestStartLine: 0,
          requestEndLine: 0,
          segments: [{
            startLine: 1,
            endLine: 4,
            filePath: collectionYmlPath,
            displayPath: 'opencollection.yml',
            scriptContent: draftCollectionScript
          }]
        };

        // NodeVM: line 4 - offset 2 = scriptRelativeLine 2, falls in segment [1,4]
        // lineInScript = 2 - 1 = 1, maps to first line of draft collection script
        const error = makeCallSiteError(bruFilePath, 4, 'draftCol.missing is not defined', 'ReferenceError');
        const result = formatErrorWithContextV2(error, 'pre-request', metadata, testDir);

        expect(result).not.toBeNull();
        expect(result.filePath).toBe('opencollection.yml');
        expect(result.errorLine).toBe(1);
        expect(result.lines[0].content).toBe('const draftCol = true;');
        expect(result.lines[0].isError).toBe(true);
      });

      it('should fall back to disk when requestScriptContent is not provided', () => {
        const metadata = {
          requestStartLine: 1,
          requestEndLine: 3
          // no requestScriptContent
        };

        const error = makeCallSiteError(bruFilePath, 3, 'token is not defined', 'ReferenceError');
        const result = formatErrorWithContextV2(error, 'pre-request', metadata, testDir);

        expect(result).not.toBeNull();
        // Should still work via disk-based fallback
        expect(result.filePath).toBe('test.bru');
      });

      it('should fall back to disk when segment scriptContent is not provided', () => {
        const metadata = {
          requestStartLine: 0,
          requestEndLine: 0,
          segments: [{
            startLine: 1,
            endLine: 4,
            filePath: collectionYmlPath,
            displayPath: 'opencollection.yml'
            // no scriptContent
          }]
        };

        const error = makeCallSiteError(bruFilePath, 4, 'error', 'ReferenceError');
        const result = formatErrorWithContextV2(error, 'pre-request', metadata, testDir);

        expect(result).not.toBeNull();
        expect(result.filePath).toBe('opencollection.yml');
      });

      it('should use scriptContent from segments when folder .bru has no script block on disk', () => {
        // Create a folder.bru with NO script block (simulates a draft where the user added a new script)
        const folderBruPath = path.join(testDir, 'folder.bru');
        fs.writeFileSync(folderBruPath, 'meta {\n  name: My Folder\n}\n');

        const draftFolderScript = 'const x = undefined;\nx.boom();';
        const metadata = {
          requestStartLine: 0,
          requestEndLine: 0,
          segments: [{
            startLine: 1,
            endLine: 4,
            filePath: folderBruPath,
            displayPath: 'folder/folder.bru',
            scriptContent: draftFolderScript
          }]
        };

        // NodeVM: line 4 - offset 2 = scriptRelativeLine 2, falls in segment [1,4]
        // lineInScript = 2 - 1 = 1
        const error = makeCallSiteError(bruFilePath, 4, 'x is undefined', 'TypeError');
        const result = formatErrorWithContextV2(error, 'pre-request', metadata, testDir);

        expect(result).not.toBeNull();
        expect(result.filePath).toBe('folder.bru');
        expect(result.errorLine).toBe(1);
        expect(result.lines[0].content).toBe('const x = undefined;');
        expect(result.lines[0].isError).toBe(true);
      });

      it('should use QuickJS offset correctly with requestScriptContent', () => {
        const draftContent = 'const x = 1;\nundefined.boom();';
        const metadata = {
          requestStartLine: 1,
          requestEndLine: 3,
          requestScriptContent: draftContent
        };

        // QuickJS: line 11 - offset 9 = scriptRelativeLine 2, within request range [1,3]
        // lineInScript = 2 - 1 = 1
        const error = makeQuickJSError(bruFilePath, 11, 'not defined', 'ReferenceError');
        const result = formatErrorWithContextV2(error, 'pre-request', metadata, testDir);

        expect(result).not.toBeNull();
        expect(result.errorLine).toBe(1);
        expect(result.lines[0].content).toBe('const x = 1;');
      });
    });
  });

  describe('stack trace with null-line segment resolution', () => {
    it('buildStackFromCallSites should not interpolate null into stack frames', () => {
      // Segment with no on-disk script block → resolveSegmentError returns line: null
      const folderBruPath = path.join(testDir, 'folder.bru');
      fs.writeFileSync(folderBruPath, 'meta {\n  name: My Folder\n}\n');

      const metadata = {
        requestStartLine: 0,
        requestEndLine: 0,
        segments: [{
          startLine: 1,
          endLine: 4,
          filePath: folderBruPath,
          displayPath: 'folder/folder.bru',
          scriptContent: 'const x = 1;\nx.boom();'
        }]
      };

      // NodeVM callSite: line 4 - offset 2 = scriptRelativeLine 2, falls in segment [1,4]
      const callSites = [{ filePath: bruFilePath, line: 4, column: 5, functionName: null }];
      const result = buildStackFromCallSites(callSites, 'pre-request', null, metadata);

      expect(result).not.toContain('null');
      // Should fall back to original file/line since resolved.line is null
      expect(result).toContain(bruFilePath);
    });

    it('adjustStackTrace should not interpolate null into stack frames', () => {
      const folderBruPath = path.join(testDir, 'folder.bru');
      fs.writeFileSync(folderBruPath, 'meta {\n  name: My Folder\n}\n');

      const metadata = {
        requestStartLine: 0,
        requestEndLine: 0,
        segments: [{
          startLine: 1,
          endLine: 4,
          filePath: folderBruPath,
          displayPath: 'folder/folder.bru',
          scriptContent: 'const x = 1;\nx.boom();'
        }]
      };

      const stack = `TypeError: x.boom is not a function\n    at ${bruFilePath}:4:5`;
      const result = adjustStackTrace(stack, 'pre-request', null, metadata, false);

      expect(result).not.toContain('null');
      // Original frame should be preserved since resolved.line is null
      expect(result).toContain(`${bruFilePath}:4:5`);
    });
  });

  describe('getSourceContextFromContent', () => {
    it('should return context lines around the error line', () => {
      const content = 'line1\nline2\nline3\nline4\nline5';
      const result = getSourceContextFromContent(content, 3, 1);

      expect(result).not.toBeNull();
      expect(result.errorLine).toBe(3);
      expect(result.lines).toHaveLength(3);
      expect(result.lines[0]).toEqual({ lineNumber: 2, content: 'line2', isError: false });
      expect(result.lines[1]).toEqual({ lineNumber: 3, content: 'line3', isError: true });
      expect(result.lines[2]).toEqual({ lineNumber: 4, content: 'line4', isError: false });
    });

    it('should return null for null/empty content', () => {
      expect(getSourceContextFromContent(null, 1)).toBeNull();
      expect(getSourceContextFromContent('', 1)).toBeNull();
    });

    it('should return null for out-of-bounds error line', () => {
      const content = 'line1\nline2';
      expect(getSourceContextFromContent(content, 0)).toBeNull();
      expect(getSourceContextFromContent(content, 3)).toBeNull();
    });

    it('should handle single-line content', () => {
      const content = 'only line';
      const result = getSourceContextFromContent(content, 1, 3);

      expect(result).not.toBeNull();
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0]).toEqual({ lineNumber: 1, content: 'only line', isError: true });
    });

    it('should clamp context at file boundaries', () => {
      const content = 'line1\nline2\nline3';
      const result = getSourceContextFromContent(content, 1, 5);

      expect(result).not.toBeNull();
      expect(result.lines).toHaveLength(3);
      expect(result.startLine).toBe(1);
    });
  });
});
