const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const {
  formatErrorWithContext,
  findScriptBlockStartLine,
  findYmlScriptBlockStartLine,
  adjustLineNumber,
  parseStackTrace,
  parseErrorLocation
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
});
